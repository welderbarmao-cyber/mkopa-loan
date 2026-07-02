import { NextResponse } from 'next/server';

export async function GET() {
  const hasToken = !!process.env.GITHUB_TOKEN;
  const tokenLen = process.env.GITHUB_TOKEN?.length || 0;
  
  // Test GitHub write
  let writeResult = 'not attempted';
  try {
    const content = Buffer.from(JSON.stringify({ test: true, time: Date.now() })).toString('base64');
    const resp = await fetch('https://api.github.com/repos/welderbarmao-cyber/mkopa-loan/contents/data/debug_test.json', {
      method: 'PUT',
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Debug test write',
        content,
        branch: 'kyc-docs',
      }),
    });
    const data = await resp.json();
    writeResult = resp.ok ? 'SUCCESS' : `FAILED: ${data.message || resp.status}`;
  } catch (e) {
    writeResult = `ERROR: ${e instanceof Error ? e.message : 'unknown'}`;
  }
  
  return NextResponse.json({ hasToken, tokenLen, writeResult });
}
