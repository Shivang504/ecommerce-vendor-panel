import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const subcategoryId = searchParams.get("subcategoryId");
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
    if (subcategoryId && subcategoryId !== "all") {
      filter.subcategoryId = new ObjectId(subcategoryId);
    }
    if (categoryId && categoryId !== "all") {
      filter.categoryId = new ObjectId(categoryId);
    }

    const childCategories = await db
      .collection("childcategories")
      .aggregate([
        { $match: filter },
        {
          $lookup: {
            from: "subcategories",
            localField: "subcategoryId",
            foreignField: "_id",
            as: "subcategory",
          },
        },
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
            subcategoryName: { $arrayElemAt: ["$subcategory.name", 0] },
            categoryName: { $arrayElemAt: ["$category.name", 0] },
          },
        },
        {
          $project: {
            subcategory: 0,
            category: 0,
          },
        },
        { $sort: { position: 1, createdAt: -1, _id: -1 } },
      ])
      .toArray();

    return NextResponse.json({
      childCategories: childCategories.map((child) => ({
        ...child,
        _id: child._id.toString(),
        subcategoryId: child.subcategoryId ? child.subcategoryId.toString() : null,
        categoryId: child.categoryId ? child.categoryId.toString() : null,
      })),
      total: childCategories.length,
    });
  } catch (error) {
    console.error("[v0] Failed to fetch child categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch child categories" },
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
      const maxPositionChildCategory = await db
        .collection("childcategories")
        .findOne({}, { sort: { position: -1 } });
      position = maxPositionChildCategory?.position !== undefined 
        ? (maxPositionChildCategory.position + 1) 
        : 0;
    }

    const newChildCategory = {
      ...body,
      position: typeof position === 'string' ? parseInt(position) || 0 : (position || 0),
      subcategoryId: body.subcategoryId && body.subcategoryId !== "none" ? new ObjectId(body.subcategoryId) : null,
      categoryId: body.categoryId && body.categoryId !== "none" ? new ObjectId(body.categoryId) : null,
      focusKeywords: Array.isArray(body.focusKeywords)
        ? body.focusKeywords
        : [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("childcategories").insertOne(newChildCategory);

    return NextResponse.json(
      {
        ...newChildCategory,
        _id: result.insertedId.toString(),
        subcategoryId: newChildCategory.subcategoryId ? newChildCategory.subcategoryId.toString() : null,
        categoryId: newChildCategory.categoryId ? newChildCategory.categoryId.toString() : null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[v0] Failed to create child category:", error);
    return NextResponse.json(
      { error: "Failed to create child category" },
      { status: 500 }
    );
  }
}

