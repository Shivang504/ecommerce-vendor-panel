import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const featured = searchParams.get("featured");

    const filter: any = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
      ];
    }
    if (status && status !== "all") {
      filter.status = status;
    }
    if (featured && featured !== "all") {
      filter.featured = featured === "true";
    }

    const categories = await db
      .collection("categories")
      .aggregate([
        { $match: filter },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "category",
            as: "products",
          },
        },
        {
          $addFields: {
            productCount: { $size: "$products" },
          },
        },
        {
          $project: {
            products: 0,
          },
        },
        { $sort: { position: 1, createdAt: -1, _id: -1 } },
      ])
      .toArray();

    return NextResponse.json({
      categories: categories.map((cat) => ({
        ...cat,
        _id: cat._id.toString(),
      })),
      total: categories.length,
    });
  } catch (error) {
    console.error("[v0] Failed to fetch categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { db } = await connectToDatabase();
    const body = await request.json();

    // Calculate default next position if not provided
    let position = body.position;
    if (position === undefined || position === null || position === '') {
      const maxPositionCategory = await db
        .collection("categories")
        .findOne({}, { sort: { position: -1 } });
      position = maxPositionCategory?.position !== undefined 
        ? (maxPositionCategory.position + 1) 
        : 0;
    }

    const newCategory = {
      ...body,
      position: typeof position === 'string' ? parseInt(position) || 0 : (position || 0),
      parentId: body.parentId === "none" ? "" : body.parentId || null,
      focusKeywords: Array.isArray(body.focusKeywords)
        ? body.focusKeywords
        : [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("categories").insertOne(newCategory);

    return NextResponse.json(
      {
        ...newCategory,
        _id: result.insertedId.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[v0] Failed to create category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}
