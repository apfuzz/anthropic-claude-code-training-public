import { filterPayments, parseFilters, sortPayments } from "@/data/queries"
import {
  exportFilename,
  parseExportColumns,
  parseExportScope,
  toCsv,
} from "@/lib/csv"
import { NextRequest, NextResponse } from "next/server"

function badRequest(message: string) {
  return NextResponse.json({ error: { message } }, { status: 400 })
}

/**
 * Exports payments as CSV.
 *
 * `scope` is `filtered` (default, honors the active filters) or `all`.
 * `columns` is a comma-separated allowlisted list; absent means every column
 * except the card last four. Both go through the shared query builder.
 */
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams

  const scope = parseExportScope(params.get("scope"))
  if (!scope) return badRequest("Unknown export scope.")

  const columns = parseExportColumns(params.get("columns"))
  if (!columns) return badRequest("Choose at least one valid column to export.")

  const requested = parseFilters(params)
  const filters =
    scope === "all"
      ? {
          ...parseFilters(new URLSearchParams()),
          sort: requested.sort,
          direction: requested.direction,
        }
      : requested

  const rows = sortPayments(
    filterPayments(filters),
    filters.sort,
    filters.direction,
  )

  const label =
    scope === "all"
      ? "all"
      : filters.status && filters.status !== "all"
        ? filters.status
        : "filtered"

  return new Response(toCsv(rows, columns), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${exportFilename(new Date(), label)}"`,
    },
  })
}
