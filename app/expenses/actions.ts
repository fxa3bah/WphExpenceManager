'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function deleteExpense(expenseId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId)

  if (error) {
    return { error: error.message }
  }

  // Revalidate all pages that might show this expense
  revalidatePath('/expenses')
  revalidatePath('/profile')
  revalidatePath('/dashboard')
  revalidatePath('/trips')

  return { success: true }
}

export async function bulkDeleteExpenses(expenseIds: string[]) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('expenses')
    .delete()
    .in('id', expenseIds)

  if (error) {
    return { error: error.message }
  }

  // Revalidate all pages that might show expenses
  revalidatePath('/expenses')
  revalidatePath('/profile')
  revalidatePath('/dashboard')
  revalidatePath('/trips')

  return { success: true }
}

export async function bulkUpdateExpenses(expenseIds: string[], updates: any) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('expenses')
    .update(updates)
    .in('id', expenseIds)

  if (error) {
    return { error: error.message }
  }

  // Revalidate all pages that might show expenses
  revalidatePath('/expenses')
  revalidatePath('/profile')
  revalidatePath('/dashboard')
  revalidatePath('/trips')

  return { success: true }
}
