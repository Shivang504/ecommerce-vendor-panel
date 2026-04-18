import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const categoryId = searchParams.get("categoryId");

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
    if (categoryId && categoryId !== "all") {
      filter.categoryId = new ObjectId(categoryId);
    }

    const subcategories = await db
      .collection("subcategories")
      .aggregate([
        { $match: filter },
        {
          $lookup: {
            from: "categories",
            localField: "categoryId",
            foreignField: "_id",
            as: "category",
          },
        },
        {
          $addFields: {
            categoryName: { $arrayElemAt: ["$category.name", 0] },
          },
        },
        {
          $project: {
            category: 0,
          },
        },
        { $sort: { position: 1, createdAt: -1, _id: -1 } },
      ])
      .toArray();

    return NextResponse.json({
      subcategories: subcategories.map((subcat) => ({
        ...subcat,
        _id: subcat._id.toString(),
        categoryId: subcat.categoryId ? subcat.categoryId.toString() : null,
      })),
      total: subcategories.length,
    });
  } catch (error) {
    console.error("[v0] Failed to fetch subcategories:", error);
    return NextResponse.json(
      { error: "Failed to fetch subcategories" },
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
      const maxPositionSubcategory = await db
        .collection("subcategories")
        .findOne({}, { sort: { position: -1 } });
      position = maxPositionSubcategory?.position !== undefined 
        ? (maxPositionSubcategory.position + 1) 
        : 0;
    }

    const newSubcategory = {
      ...body,
      position: typeof position === 'string' ? parseInt(position) || 0 : (position || 0),
      categoryId: body.categoryId && body.categoryId !== "none" ? new ObjectId(body.categoryId) : null,
      focusKeywords: Array.isArray(body.focusKeywords)
        ? body.focusKeywords
        : [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("subcategories").insertOne(newSubcategory);

    return NextResponse.json(
      {
        ...newSubcategory,
        _id: result.insertedId.toString(),
        categoryId: newSubcategory.categoryId ? newSubcategory.categoryId.toString() : null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[v0] Failed to create subcategory:", error);
    return NextResponse.json(
      { error: "Failed to create subcategory" },
      { status: 500 }
    );
  }
}

