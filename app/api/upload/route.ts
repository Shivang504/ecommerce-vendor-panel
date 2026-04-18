import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    console.log('[v0] Upload request received');
    
    const formData = await request.formData();
    console.log('[v0] FormData parsed');
    
    const file = formData.get('file') as File;
    console.log('[v0] File from formData:', file?.name, file?.size, file?.type);

    if (!file) {
      console.error('[v0] No file in request');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size === 0) {
      console.error('[v0] File is empty');
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      console.error('[v0] File is not an image:', file.type);
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Check file size (limit to 5MB to prevent issues)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      console.error('[v0] File too large:', file.size);
      return NextResponse.json({ 
        error: 'File too large', 
        details: 'Maximum file size is 5MB. Please compress your image and try again.' 
      }, { status: 400 });
    }

    console.log('[v0] Converting image to base64...');
    
    // Convert file to base64 data URL
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    console.log('[v0] Upload successful, returning data URL');
    return NextResponse.json({ url: dataUrl });
  } catch (error) {
    console.error('[v0] Upload error details:', error);
    return NextResponse.json({ 
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
