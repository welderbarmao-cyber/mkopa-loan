// GitHub-based file storage for KYC documents
// Uses Git Blobs API (supports up to 100MB) instead of Contents API (1MB limit)
// This bypasses ALL size limits

const GITHUB_API = 'https://api.github.com/repos/welderbarmao-cyber/mkopa-loan';
const BRANCH = 'kyc-docs';
const TOKEN = process.env.GITHUB_TOKEN;

// Upload using Git Blobs API - supports up to 100MB
export async function uploadToGitHub(filename: string, content: string): Promise<string> {
  if (!TOKEN) {
    throw new Error('GITHUB_TOKEN not configured');
  }

  // Extract raw base64 from data URL
  const matches = content.match(/^data:(image\/\w+);base64,(.+)$/);
  const base64Content = matches ? matches[2] : content;

  // Step 1: Create a blob (supports large files up to 100MB)
  const blobResponse = await fetch(`${GITHUB_API}/git/blobs`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({
      content: base64Content,
      encoding: 'base64',
    }),
  });

  if (!blobResponse.ok) {
    const err = await blobResponse.json();
    throw new Error(`GitHub blob creation failed: ${err.message || blobResponse.status}`);
  }

  const blob = await blobResponse.json();
  const blobSha = blob.sha;

  // Step 2: Get the current branch head commit
  const refResponse = await fetch(`${GITHUB_API}/git/refs/heads/${BRANCH}`, {
    headers: {
      'Authorization': `token ${TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!refResponse.ok) {
    // Branch might not exist - create it from main
    const mainRef = await fetch(`${GITHUB_API}/git/refs/heads/main`, {
      headers: {
        'Authorization': `token ${TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    const mainData = await mainRef.json();
    await fetch(`${GITHUB_API}/git/refs`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        ref: `refs/heads/${BRANCH}`,
        sha: mainData.object.sha,
      }),
    });
  }

  const refData = await refResponse.json();
  const commitSha = refData.object.sha;

  // Step 3: Get the commit's tree
  const commitResponse = await fetch(`${GITHUB_API}/git/commits/${commitSha}`, {
    headers: {
      'Authorization': `token ${TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });
  const commitData = await commitResponse.json();
  const treeSha = commitData.tree.sha;

  // Step 4: Create a new tree with the blob
  const treeResponse = await fetch(`${GITHUB_API}/git/trees`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({
      base_tree: treeSha,
      tree: [{
        path: `kyc-docs/${filename}`,
        mode: '100644',
        type: 'blob',
        sha: blobSha,
      }],
    }),
  });

  const treeData = await treeResponse.json();
  const newTreeSha = treeData.sha;

  // Step 5: Create a commit
  const newCommitResponse = await fetch(`${GITHUB_API}/git/commits`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({
      message: `Upload KYC document: ${filename}`,
      tree: newTreeSha,
      parents: [commitSha],
    }),
  });

  const newCommitData = await newCommitResponse.json();
  const newCommitSha = newCommitData.sha;

  // Step 6: Update the branch ref
  await fetch(`${GITHUB_API}/git/refs/heads/${BRANCH}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `token ${TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({
      sha: newCommitSha,
    }),
  });

  return `github/${filename}`;
}

// Get file from GitHub
export async function getFromGitHub(filename: string): Promise<string | null> {
  if (!TOKEN) return null;

  try {
    // Use raw content URL for faster access
    const rawUrl = `https://raw.githubusercontent.com/welderbarmao-cyber/mkopa-loan/${BRANCH}/kyc-docs/${filename}`;

    const response = await fetch(rawUrl, {
      headers: {
        'Authorization': `token ${TOKEN}`,
        'Accept': 'application/vnd.github.v3.raw',
      },
    });

    if (!response.ok) return null;

    // Get as base64
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    const matches = filename.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    const ext = matches ? matches[1].toLowerCase() : 'jpeg';
    const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
}

export function isGitHubConfigured(): boolean {
  return !!TOKEN;
}
