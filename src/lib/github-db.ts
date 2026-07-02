// GitHub-based data storage - replaces Edge Config writes
// Edge Config free plan: 250 writes/month (exhausted)
// GitHub API: 5000 writes/hour (practically unlimited)

const GITHUB_API = 'https://api.github.com/repos/welderbarmao-cyber/mkopa-loan';
const BRANCH = 'kyc-docs';
const TOKEN = process.env.GITHUB_TOKEN;

// Cache for reads (Edge Config reads are unlimited)
const readCache = new Map<string, unknown>();

async function ghRead<T = unknown>(path: string): Promise<T | null> {
  const cacheKey = `gh_${path}`;
  if (readCache.has(cacheKey)) return readCache.get(cacheKey) as T;
  
  try {
    const url = `https://raw.githubusercontent.com/welderbarmao-cyber/mkopa-loan/${BRANCH}/${path}`;
    const response = await fetch(url, {
      headers: { 'Authorization': `token ${TOKEN}` },
    });
    if (!response.ok) return null;
    const data = await response.json();
    readCache.set(cacheKey, data);
    // Clear cache after 5 seconds
    readCache.delete(cacheKey);
    return data;
  } catch {
    return null;
  }
}

async function ghWrite<T>(path: string, data: T): Promise<boolean> {
  if (!TOKEN) return false;
  
  // Retry up to 3 times (handles SHA conflicts from concurrent writes)
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const content = Buffer.from(JSON.stringify(data)).toString('base64');
      
      // Get existing file SHA (if exists) - fresh each attempt
      let sha: string | undefined;
      try {
        const resp = await fetch(`${GITHUB_API}/contents/${path}?ref=${BRANCH}`, {
          headers: { 'Authorization': `token ${TOKEN}`, 'Accept': 'application/vnd.github.v3+json' },
          cache: 'no-store',
        });
        if (resp.ok) {
          const fileData = await resp.json();
          sha = fileData.sha;
        }
      } catch {}
      
      // Create or update file
      const body: { message: string; content: string; branch: string; sha?: string } = {
        message: `Update ${path}`,
        content,
        branch: BRANCH,
      };
      if (sha) body.sha = sha;
      
      const response = await fetch(`${GITHUB_API}/contents/${path}`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify(body),
      });
      
      if (response.ok) {
        readCache.delete(`gh_${path}`);
        return true;
      }
      
      // If conflict (409) or unprocessable (422), retry with fresh SHA
      if (response.status === 409 || response.status === 422) {
        await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
        continue;
      }
      
      // If file too large for Contents API, use Blobs API
      if (response.status === 413 || JSON.stringify(data).length > 500000) {
        return await ghWriteViaBlobs(path, data);
      }
      
      return false;
    } catch {
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
        continue;
      }
      return false;
    }
  }
  return false;
}

async function ghWriteViaBlobs<T>(path: string, data: T): Promise<boolean> {
  try {
    const content = Buffer.from(JSON.stringify(data)).toString('base64');
    
    // Create blob
    const blobResp = await fetch(`${GITHUB_API}/git/blobs`, {
      method: 'POST',
      headers: { 'Authorization': `token ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, encoding: 'base64' }),
    });
    if (!blobResp.ok) return false;
    const blob = await blobResp.json();
    
    // Get branch ref
    const refResp = await fetch(`${GITHUB_API}/git/refs/heads/${BRANCH}`, {
      headers: { 'Authorization': `token ${TOKEN}` },
    });
    if (!refResp.ok) return false;
    const ref = await refResp.json();
    const commitSha = ref.object.sha;
    
    // Get commit tree
    const commitResp = await fetch(`${GITHUB_API}/git/commits/${commitSha}`, {
      headers: { 'Authorization': `token ${TOKEN}` },
    });
    const commit = await commitResp.json();
    
    // Create tree
    const treeResp = await fetch(`${GITHUB_API}/git/trees`, {
      method: 'POST',
      headers: { 'Authorization': `token ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base_tree: commit.tree.sha,
        tree: [{ path, mode: '100644', type: 'blob', sha: blob.sha }],
      }),
    });
    const tree = await treeResp.json();
    
    // Create commit
    const newCommitResp = await fetch(`${GITHUB_API}/git/commits`, {
      method: 'POST',
      headers: { 'Authorization': `token ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `Update ${path}`, tree: tree.sha, parents: [commitSha] }),
    });
    const newCommit = await newCommitResp.json();
    
    // Update ref
    await fetch(`${GITHUB_API}/git/refs/heads/${BRANCH}`, {
      method: 'PATCH',
      headers: { 'Authorization': `token ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha: newCommit.sha }),
    });
    
    readCache.delete(`gh_${path}`);
    return true;
  } catch {
    return false;
  }
}

// Data access functions
export async function readData<T>(key: string): Promise<T | null> {
  return await ghRead(`data/${key}.json`);
}

export async function writeData<T>(key: string, data: T): Promise<boolean> {
  return await ghWrite(`data/${key}.json`, data);
}

export function isGitHubDbConfigured(): boolean {
  return !!TOKEN;
}
