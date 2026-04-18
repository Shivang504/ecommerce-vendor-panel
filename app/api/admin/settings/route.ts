import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

const DEFAULT_SETTINGS = {
  siteName: 'Grocify Admin',
  siteTitle: 'Grocify – Admin Panel',
  tagline: '',
  primaryColor: '#16a34a',
  accentColor: '#0f172a',
  logo: '',
  favicon: '',
  productType: true,
  registeredOfficeAddress: '',
  mailUsAddress: '',
  phoneNumber: '',
  cin: '',
  trustIcons: [],
  codMaxLimit: 5000, // Default COD limit: ₹5,000
  codChargeType: 'amount', // Charge type: percentage or amount
  codChargeValue: 0, // Charge value
};

function normalizeSettings(doc: any = {}) {
  return {
    siteName: doc.siteName ?? DEFAULT_SETTINGS.siteName,
    siteTitle: doc.siteTitle ?? DEFAULT_SETTINGS.siteTitle,
    tagline: doc.tagline ?? DEFAULT_SETTINGS.tagline,
    primaryColor: doc.primaryColor ?? DEFAULT_SETTINGS.primaryColor,
    accentColor: doc.accentColor ?? DEFAULT_SETTINGS.accentColor,
    logo: doc.logo ?? DEFAULT_SETTINGS.logo,
    favicon: doc.favicon ?? DEFAULT_SETTINGS.favicon,
    productType: doc.productType ?? DEFAULT_SETTINGS.productType,
    registeredOfficeAddress: doc.registeredOfficeAddress ?? DEFAULT_SETTINGS.registeredOfficeAddress,
    mailUsAddress: doc.mailUsAddress ?? DEFAULT_SETTINGS.mailUsAddress,
    phoneNumber: doc.phoneNumber ?? DEFAULT_SETTINGS.phoneNumber,
    cin: doc.cin ?? DEFAULT_SETTINGS.cin,
    trustIcons: Array.isArray(doc.trustIcons) ? doc.trustIcons : (DEFAULT_SETTINGS.trustIcons || []),
    codMaxLimit: doc.codMaxLimit ?? DEFAULT_SETTINGS.codMaxLimit,
    codChargeType: doc.codChargeType ?? DEFAULT_SETTINGS.codChargeType,
    codChargeValue: doc.codChargeValue ?? DEFAULT_SETTINGS.codChargeValue,
    updatedAt: doc.updatedAt ?? null,
    createdAt: doc.createdAt ?? null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const settings = await db.collection('settings').findOne({});

    return NextResponse.json(normalizeSettings(settings));
  } catch (error) {
    console.error('[v0] Failed to fetch settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const body = await request.json();

    const siteName = (body.siteName || '').trim();
    const siteTitle = (body.siteTitle || '').trim();
    const tagline = (body.tagline || '').trim();
    const primaryColor = (body.primaryColor || DEFAULT_SETTINGS.primaryColor).trim();
    const accentColor = (body.accentColor || DEFAULT_SETTINGS.accentColor).trim();
    const logo = body.logo || '';
    const favicon = body.favicon || '';
    const productType = body.productType ?? DEFAULT_SETTINGS.productType;
    const registeredOfficeAddress = (body.registeredOfficeAddress || '').trim();
    const mailUsAddress = (body.mailUsAddress || '').trim();
    const phoneNumber = (body.phoneNumber || '').trim();
    const cin = (body.cin || '').trim();
    const trustIcons = Array.isArray(body.trustIcons) ? body.trustIcons.filter((url: string) => url && url.trim()) : [];
    const codMaxLimit = typeof body.codMaxLimit === 'number' ? body.codMaxLimit : (body.codMaxLimit ? parseFloat(body.codMaxLimit) : DEFAULT_SETTINGS.codMaxLimit);
    const codChargeType = body.codChargeType === 'percentage' || body.codChargeType === 'amount' ? body.codChargeType : DEFAULT_SETTINGS.codChargeType;
    const codChargeValue = codChargeType && typeof body.codChargeValue === 'number' && body.codChargeValue > 0 ? body.codChargeValue : DEFAULT_SETTINGS.codChargeValue;

    if (!siteName) {
      return NextResponse.json({ error: 'Website name is required' }, { status: 400 });
    }
    if (!siteTitle) {
      return NextResponse.json({ error: 'Page title is required' }, { status: 400 });
    }

    const now = new Date();

    const result = await db.collection('settings').findOneAndUpdate(
      {},
      {
        $set: {
          siteName,
          siteTitle,
          tagline,
          primaryColor,
          accentColor,
          logo,
          favicon,
          productType,
          registeredOfficeAddress,
          mailUsAddress,
          phoneNumber,
          cin,
          trustIcons,
          codMaxLimit,
          codChargeType,
          codChargeValue,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
      },
    );

    // If result.value is null (shouldn't happen with upsert, but just in case),
    // fetch the document again to ensure we return the updated data
    let updatedDoc = result?.value;
    if (!updatedDoc) {
      updatedDoc = await db.collection('settings').findOne({});
    }

    return NextResponse.json(normalizeSettings(updatedDoc || {}));
  } catch (error) {
    console.error('[v0] Failed to update settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}

