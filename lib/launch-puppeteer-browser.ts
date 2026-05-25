import type { Browser } from 'puppeteer-core';

const SERVERLESS_ARGS = ['--no-sandbox', '--disable-setuid-sandbox'] as const;

function isServerlessRuntime(): boolean {
  return (
    process.env.VERCEL === '1' ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    Boolean(process.env.AWS_EXECUTION_ENV) ||
    (process.env.NODE_ENV === 'production' && process.platform === 'linux')
  );
}

async function launchOnServerless(): Promise<Browser> {
  const chromium = await import('@sparticuz/chromium');
  const puppeteer = await import('puppeteer-core');

  return puppeteer.default.launch({
    args: [...chromium.default.args, ...SERVERLESS_ARGS],
    defaultViewport: chromium.default.defaultViewport,
    executablePath: await chromium.default.executablePath(),
    headless: chromium.default.headless,
  });
}

async function launchLocally(): Promise<Browser> {
  try {
    const puppeteer = await import('puppeteer');
    return puppeteer.default.launch({
      headless: true,
      args: [...SERVERLESS_ARGS],
    });
  } catch {
    const chromium = await import('@sparticuz/chromium');
    const puppeteer = await import('puppeteer-core');

    return puppeteer.default.launch({
      args: [...chromium.default.args, ...SERVERLESS_ARGS],
      defaultViewport: chromium.default.defaultViewport,
      executablePath: await chromium.default.executablePath(),
      headless: chromium.default.headless,
    });
  }
}

export async function launchPuppeteerBrowser(): Promise<Browser> {
  if (isServerlessRuntime()) {
    return launchOnServerless();
  }
  return launchLocally();
}
