import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleCleanup(request);
}

export async function POST(request: NextRequest) {
  return handleCleanup(request);
}

async function handleCleanup(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET environment variable is not configured");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Service-role client required for scheduled background maintenance across storage and rate limits
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json(
      { error: "Database maintenance client unavailable" },
      { status: 503 }
    );
  }

  let purgedFilesCount = 0;
  let purgedRateLimitsCount = 0;

  // 1. Purge storage objects in 'reports' bucket older than 1 hour (abandoned uploads)
  try {
    const ONE_HOUR_AGO = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: rootItems, error: listError } = await adminClient.storage
      .from("reports")
      .list("", { limit: 100 });

    if (!listError && rootItems) {
      for (const item of rootItems) {
        // Folders are keyed by userId
        const { data: userFiles } = await adminClient.storage
          .from("reports")
          .list(item.name, { limit: 100 });

        if (userFiles && userFiles.length > 0) {
          const filesToDelete: string[] = [];

          for (const file of userFiles) {
            // If file was created/updated more than 1 hour ago
            const fileTime = file.created_at || file.updated_at;
            if (fileTime && fileTime < ONE_HOUR_AGO) {
              filesToDelete.push(`${item.name}/${file.name}`);
            }
          }

          if (filesToDelete.length > 0) {
            const { data: removed } = await adminClient.storage
              .from("reports")
              .remove(filesToDelete);
            if (removed) {
              purgedFilesCount += removed.length;
            }
          }
        }
      }
    }
  } catch (storageErr) {
    console.warn("Storage cleanup notice during cron job:", storageErr);
  }

  // 2. Purge rate limits older than 3 days
  try {
    const THREE_DAYS_AGO = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data: deletedRows, error: rateLimitError } = await adminClient
      .from("rate_limits")
      .delete()
      .lt("window_start", THREE_DAYS_AGO)
      .select("key");

    if (!rateLimitError && deletedRows) {
      purgedRateLimitsCount = deletedRows.length;
    }
  } catch (rateLimitErr) {
    console.warn("Rate limit table cleanup notice:", rateLimitErr);
  }

  return NextResponse.json({
    success: true,
    purgedFilesCount,
    purgedRateLimitsCount,
    timestamp: new Date().toISOString(),
  });
}
