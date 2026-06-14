import { useState } from 'react'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import {
  Archive,
  ArchiveRestore,
  MoreHorizontal,
  Pencil,
  Plus,
} from 'lucide-react'
import { PageHeader } from '../../components/page-header'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import {
  DropdownItem,
  DropdownMenu,
} from '../../components/ui/dropdown-menu'
import { FormField } from '../../components/form-field'
import { StatusPill } from '../../components/status-pill'
import { Money } from '../../components/money'
import { ServiceFormDialog } from '../../features/pawboard/components/service-form-dialog'
import { useServerMutation } from '../../hooks/use-server-mutation'
import {
  setServiceTypeActiveFn,
  updateSettingsFn,
} from '../../features/pawboard/functions'
import { settingsInputSchema } from '../../features/pawboard/schemas'
import type { BusinessSettings, ServiceType } from '../../domain/pawboard'

export const Route = createFileRoute('/_authed/settings')({
  component: SettingsPage,
})

const route = getRouteApi('/_authed')

function SettingsPage() {
  const { snapshot } = route.useLoaderData()
  const [serviceDialog, setServiceDialog] = useState<{
    open: boolean
    service?: ServiceType
  }>({ open: false })

  const serviceActive = useServerMutation(setServiceTypeActiveFn)

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader
        title="Settings"
        description="Business profile, invoice defaults, and service rates."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <BusinessProfileForm settings={snapshot.settings} />

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-sm">Services & rates</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setServiceDialog({ open: true })}
            >
              <Plus size={15} /> Add service
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.serviceTypes.map((service) => (
                  <TableRow
                    key={service.id}
                    className={service.active ? '' : 'opacity-60'}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {service.name}
                        {service.active ? null : (
                          <StatusPill tone="neutral" label="Archived" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground capitalize">
                      {service.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      <Money cents={service.defaultRateCents} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu
                        trigger={
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal size={16} />
                          </Button>
                        }
                      >
                        <DropdownItem
                          onSelect={() =>
                            setServiceDialog({ open: true, service })
                          }
                        >
                          <Pencil size={14} /> Edit
                        </DropdownItem>
                        <DropdownItem
                          onSelect={() =>
                            serviceActive.mutate({
                              id: service.id,
                              active: !service.active,
                            })
                          }
                        >
                          {service.active ? (
                            <>
                              <Archive size={14} /> Archive
                            </>
                          ) : (
                            <>
                              <ArchiveRestore size={14} /> Restore
                            </>
                          )}
                        </DropdownItem>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <ServiceFormDialog
        open={serviceDialog.open}
        service={serviceDialog.service}
        onOpenChange={(open) => setServiceDialog((s) => ({ ...s, open }))}
      />
    </div>
  )
}

interface ProfileState {
  businessName: string
  legalName: string
  phone: string
  email: string
  address: string
  timezone: string
  hstNumber: string
  hstRatePercent: number
  invoicePrefix: string
  boardingCapacity: number
  daycareCapacity: number
  cashPaymentInstructions: string
  etransferInstructions: string
}

function BusinessProfileForm({ settings }: { settings: BusinessSettings }) {
  const [values, setValues] = useState<ProfileState>({
    businessName: settings.businessName,
    legalName: settings.legalName,
    phone: settings.phone,
    email: settings.email,
    address: settings.address,
    timezone: settings.timezone,
    hstNumber: settings.hstNumber,
    hstRatePercent: Math.round(settings.hstRate * 10000) / 100,
    invoicePrefix: settings.invoicePrefix,
    boardingCapacity: settings.boardingCapacity,
    daycareCapacity: settings.daycareCapacity,
    cashPaymentInstructions: settings.cashPaymentInstructions,
    etransferInstructions: settings.etransferInstructions,
  })
  const [error, setError] = useState('')

  const save = useServerMutation(updateSettingsFn, {
    successMessage: 'Settings saved',
  })

  const set = <TKey extends keyof ProfileState>(
    key: TKey,
    value: ProfileState[TKey],
  ) =>
    setValues((current) => ({ ...current, [key]: value }))

  const submit = async () => {
    setError('')
    const parsed = settingsInputSchema.safeParse(values)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check the form.')
      return
    }
    await save.mutate(parsed.data)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Business profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Business name" className="sm:col-span-2" error={error}>
            <Input
              value={values.businessName}
              onChange={(e) => set('businessName', e.target.value)}
            />
          </FormField>
          <FormField label="Legal name">
            <Input
              value={values.legalName}
              onChange={(e) => set('legalName', e.target.value)}
            />
          </FormField>
          <FormField label="Phone">
            <Input value={values.phone} onChange={(e) => set('phone', e.target.value)} />
          </FormField>
          <FormField label="Email">
            <Input
              type="email"
              value={values.email}
              onChange={(e) => set('email', e.target.value)}
            />
          </FormField>
          <FormField label="Address">
            <Input
              value={values.address}
              onChange={(e) => set('address', e.target.value)}
            />
          </FormField>
          <FormField label="HST number">
            <Input
              value={values.hstNumber}
              onChange={(e) => set('hstNumber', e.target.value)}
            />
          </FormField>
          <FormField label="HST rate (%)">
            <Input
              type="number"
              step="0.01"
              value={values.hstRatePercent}
              onChange={(e) => set('hstRatePercent', Number(e.target.value))}
            />
          </FormField>
          <FormField label="Invoice prefix">
            <Input
              value={values.invoicePrefix}
              onChange={(e) => set('invoicePrefix', e.target.value)}
            />
          </FormField>
          <FormField label="Timezone">
            <Input
              value={values.timezone}
              onChange={(e) => set('timezone', e.target.value)}
            />
          </FormField>
          <FormField label="Boarding capacity">
            <Input
              type="number"
              min="0"
              value={values.boardingCapacity}
              onChange={(e) => set('boardingCapacity', Number(e.target.value))}
            />
          </FormField>
          <FormField label="Daycare capacity">
            <Input
              type="number"
              min="0"
              value={values.daycareCapacity}
              onChange={(e) => set('daycareCapacity', Number(e.target.value))}
            />
          </FormField>
          <FormField label="Cash instructions" className="sm:col-span-2">
            <Textarea
              value={values.cashPaymentInstructions}
              onChange={(e) => set('cashPaymentInstructions', e.target.value)}
            />
          </FormField>
          <FormField label="E-transfer instructions" className="sm:col-span-2">
            <Textarea
              value={values.etransferInstructions}
              onChange={(e) => set('etransferInstructions', e.target.value)}
            />
          </FormField>
        </div>
        <div className="flex justify-end">
          <Button onClick={submit} disabled={save.pending}>
            {save.pending ? 'Saving…' : 'Save settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
