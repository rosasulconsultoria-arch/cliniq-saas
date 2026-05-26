'use server'

import { revalidatePath } from 'next/cache'
import { withTenantAction } from '@/lib/with-tenant-action'
import { getTenantId } from '@/lib/tenant-context'
import { db } from '@/lib/db'

export async function dispensarTour(): Promise<void> {
  return withTenantAction(async () => {
    const tenantId = getTenantId()
    await db.tenant.update({
      where: { id: tenantId },
      data: { tourCompleted: true },
    })
    revalidatePath('/dashboard')
  })
}
