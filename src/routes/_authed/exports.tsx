import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { Download, History } from 'lucide-react'
import { PageHeader } from '../../components/page-header'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { EmptyState } from '../../components/empty-state'
import { formatMoney } from '../../domain/pricing'
import { formatDateTime, titleCase } from '../../lib/format'
import {
  dogNames,
  ownerName,
  serviceName,
} from '../../features/pawboard/selectors'
import type { PawboardSnapshot } from '../../domain/pawboard'

export const Route = createFileRoute('/_authed/exports')({
  component: ExportsPage,
})

const route = getRouteApi('/_authed')

function ExportsPage() {
  const { snapshot } = route.useLoaderData()

  const exports: Array<{ label: string; content: string; json?: boolean }> = [
    { label: 'Owners CSV', content: ownersCsv(snapshot) },
    { label: 'Dogs CSV', content: dogsCsv(snapshot) },
    { label: 'Bookings CSV', content: bookingsCsv(snapshot) },
    { label: 'Invoices CSV', content: invoicesCsv(snapshot) },
    { label: 'Backup JSON', content: JSON.stringify(snapshot, null, 2), json: true },
  ]

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader
        title="Exports"
        description="Download CSV reports, a full JSON backup, and review the audit trail."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {exports.map((item) => (
          <DownloadCard key={item.label} {...item} />
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <History size={15} /> Audit history
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {snapshot.auditLogs.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...snapshot.auditLogs]
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                  .map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant="outline">{titleCase(log.action)}</Badge>
                      </TableCell>
                      <TableCell>{log.summary}</TableCell>
                      <TableCell className="text-muted-foreground text-right text-xs">
                        {formatDateTime(log.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState title="No activity yet" />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function DownloadCard({
  label,
  content,
  json,
}: {
  label: string
  content: string
  json?: boolean
}) {
  const download = () => {
    const blob = new Blob([content], {
      type: json ? 'application/json' : 'text/csv',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download =
      label.toLowerCase().replaceAll(' ', '-') + (json ? '.json' : '.csv')
    anchor.click()
    URL.revokeObjectURL(url)
  }
  return (
    <Card className="flex items-center justify-between gap-3 p-4">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-muted-foreground text-xs">
          {json ? 'Full snapshot' : 'Comma-separated values'}
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={download}>
        <Download size={15} /> Download
      </Button>
    </Card>
  )
}

function csv(rows: string[][]) {
  return rows
    .map((row) =>
      row.map((value) => `"${value.replaceAll('"', '""')}"`).join(','),
    )
    .join('\n')
}

function ownersCsv(snapshot: PawboardSnapshot) {
  return csv([
    ['First name', 'Last name', 'Phone', 'Email', 'Active'],
    ...snapshot.owners.map((owner) => [
      owner.firstName,
      owner.lastName,
      owner.phone,
      owner.email,
      owner.active ? 'yes' : 'no',
    ]),
  ])
}

function dogsCsv(snapshot: PawboardSnapshot) {
  return csv([
    ['Name', 'Owner', 'Breed', 'Size', 'Care notes'],
    ...snapshot.dogs.map((dog) => [
      dog.name,
      ownerName(snapshot, dog.ownerId),
      dog.breed,
      dog.size,
      dog.careNotes,
    ]),
  ])
}

function bookingsCsv(snapshot: PawboardSnapshot) {
  return csv([
    ['Owner', 'Dogs', 'Service', 'Start', 'End', 'Status', 'Total'],
    ...snapshot.bookings.map((booking) => [
      ownerName(snapshot, booking.ownerId),
      dogNames(snapshot, booking.dogIds),
      serviceName(snapshot, booking.serviceTypeId),
      booking.startAt,
      booking.endAt,
      booking.status,
      formatMoney(booking.quotedTotalCents),
    ]),
  ])
}

function invoicesCsv(snapshot: PawboardSnapshot) {
  return csv([
    ['Invoice', 'Owner', 'Status', 'Total', 'Paid', 'Balance'],
    ...snapshot.invoices.map((invoice) => [
      invoice.invoiceNumber,
      invoice.snapshot.ownerName,
      invoice.status,
      formatMoney(invoice.totalCents),
      formatMoney(invoice.paidCents),
      formatMoney(invoice.balanceCents),
    ]),
  ])
}
