import { NextRequest, NextResponse } from 'next/server';
import { verifyVendorDetails } from '@/lib/cashfree-secure-id';

/**
 * POST /api/verify/details
 * Verify vendor details (Bank, PAN, GST) in real-time
 * This endpoint is called when user clicks Continue button during registration
 */
export async function POST(request: NextRequest) {
  let accountNumber, ifscCode, accountHolderName, panNumber, gstNumber;
  
  try {
    const body = await request.json();
    
    ({ accountNumber, ifscCode, accountHolderName, panNumber, gstNumber } = body);

    // If no verification data provided, return success
    if (!accountNumber && !panNumber && !gstNumber) {
      return NextResponse.json({
        success: true,
        message: 'No verification data provided',
        verification: {},
      });
    }

    // Trigger verification
    const verificationResults = await verifyVendorDetails({
      accountNumber,
      ifscCode,
      accountHolderName,
      panNumber,
      gstNumber,
    });

    return NextResponse.json({
      success: true,
      message: 'Verification completed',
      verification: verificationResults,
    });
  } catch (error: any) {
    console.error('[Verify Details] Error:', {
      message: error.message,
      stack: error.stack,
    });
    
    const errorMessage = error.message || 'Verification failed';
    
    // Handle test environment errors gracefully
    if (
      errorMessage.includes('test environment') ||
      errorMessage.includes('404') ||
      errorMessage.includes('endpoint not available') ||
      errorMessage.includes('not configured')
    ) {
      return NextResponse.json({
        success: true,
        message: 'Cashfree API is in test mode. Verification will work once API access is fully enabled.',
        verification: {
          errors: [{
            type: gstNumber ? 'gst' : 'general',
            error: 'API access pending configuration. Please contact Cashfree support to enable API access.',
          }],
        },
      });
    }
    
    // Handle rate limiting or temporary API errors (500, 503, etc.)
    if (
      errorMessage.toLowerCase().includes('something went wrong') ||
      errorMessage.toLowerCase().includes('try after some time') ||
      errorMessage.toLowerCase().includes('rate limit') ||
      errorMessage.toLowerCase().includes('temporarily unavailable') ||
      errorMessage.toLowerCase().includes('internal server error') ||
      errorMessage.toLowerCase().includes('service unavailable')
    ) {
      return NextResponse.json({
        success: false,
        message: 'Cashfree API is temporarily unavailable. This is a server-side issue. Please try again after a few minutes.',
        verification: {
          errors: [{
            type: gstNumber ? 'gst' : (accountNumber ? 'bank' : 'pan'),
            error: 'Cashfree API is experiencing issues. Please try again after some time or contact support if the problem persists.',
          }],
        },
      }, { status: 200 }); // Return 200 but with success: false to allow UI to handle gracefully
    }
    
    // For other errors, allow user to continue (GST is optional)
    return NextResponse.json(
      {
        success: false,
        message: 'Verification attempted but failed. You can still continue (GST is optional).',
        verification: {
          errors: [{
            type: gstNumber ? 'gst' : (accountNumber ? 'bank' : 'pan'),
            error: errorMessage || 'Verification failed',
          }],
        },
      },
      { status: 200 }
    );
  }
}
