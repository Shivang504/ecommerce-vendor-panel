import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";

export async function PUT(request: Request) {
  try {
    const { db } = await connectToDatabase();
    const body = await request.json();
    const { positions } = body; // Array of { id: string, position: number }

    if (!Array.isArray(positions)) {
      return NextResponse.json(
        { error: "Invalid request. Expected positions array." },
        { status: 400 }
      );
    }

    // Update positions in bulk
    const updatePromises = positions.map(({ id, position }: { id: string; position: number }) =>
      db.collection("categories").updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            position: position,
            updatedAt: new Date() 
          } 
        }
      )
    );

    await Promise.all(updatePromises);

    // Invalidate cache for categories API to show updated positions immediately
    revalidatePath('/api/categories/with-hierarchy');

    return NextResponse.json({ 
      message: "Positions updated successfully",
      updated: positions.length 
    });
  } catch (error) {
    console.error("[v0] Failed to update positions:", error);
    return NextResponse.json(
      { error: "Failed to update positions" },
      { status: 500 }
    );
  }
}

