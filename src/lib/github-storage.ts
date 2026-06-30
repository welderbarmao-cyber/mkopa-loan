// GitHub-based file storage for KYC documents
// Uses the GitHub API to store files in a separate branch (kyc-docs)
// This bypasses Edge Config's size limits entirely

const GITHUB_API = 'https://api.github.com/repos/welderbarmao-cyber/mkopa-loan';
const BRANCH = 'kyc-docs';
const TOKEN = process.env.GITHUB_TOKEN;

export async function uploadToGitHub(filename: string, content: string): Promise<string> {
  if (!TOKEN) {
    throw new Error('GITHUB_TOKEN not configured');
  }

  // content is base64 data URL: data:image/jpeg;base64,...
  // Extract the raw base64 content
  const matches = content.match(/^data:(image\/\w+);base64,(.+)$/);
  const base64Content = matches ? matches[2] : content;

  // Upload to GitHub
  const response = await fetch(`${GITHUB_API}/contents/kyc-docs/${filename}`, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({
      message: `Upload KYC document: ${filename}`,
      content: base64Content,
      branch: BRANCH,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`GitHub upload failed: ${data.message || response.status}`);
  }

  // Return the raw URL for viewing
  return data.content.download_url || data.content.html_url;
}

export async function getFromGitHub(filename: string): Promise<string | null> {
  if (!TOKEN) return null;

  try {
    const response = await fetch(`${GITHUB_API}/contents/kyc-docs/${filename}?ref=${BRANCH}`, {
      headers: {
        'Authorization': `token ${TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.content && data.encoding === 'base64') {
      const matches = filename.match(/\.(jpg|jpeg|png|gif|webp)$/i);
      const ext = matches ? matches[1].toLowerCase() : 'jpeg';
      const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      return `data:${mime};base64,${data.content.replace(/\n/g, '')}`;
    }
    return null;
  } catch {
    return null;
  }
}

export function isGitHubConfigured(): boolean {
  return !!TOKEN;
}
