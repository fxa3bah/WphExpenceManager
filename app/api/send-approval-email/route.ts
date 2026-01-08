import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { expenseId, action } = await request.json()

    if (!expenseId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get expense details
    const { data: expense } = await supabase
      .from('expenses')
      .select('*, users:user_id(full_name, email)')
      .eq('id', expenseId)
      .single()

    if (!expense || !expense.users) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    const subject = action === 'approved'
      ? `Expense Approved - ${expense.merchant_name || expense.category}`
      : `Expense Rejected - ${expense.merchant_name || expense.category}`

    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${action === 'approved' ? '#10b981' : '#ef4444'}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .detail { margin: 10px 0; }
            .label { font-weight: bold; color: #6b7280; }
            .value { color: #111827; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #d1d5db; text-align: center; color: #6b7280; font-size: 12px; }
            .button { display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${action === 'approved' ? '✓ Expense Approved' : '✗ Expense Rejected'}</h1>
            </div>
            <div class="content">
              <p>Hello ${expense.users.full_name},</p>
              <p>Your expense has been ${action}.</p>

              <div class="detail">
                <span class="label">Amount:</span>
                <span class="value">${expense.currency} ${expense.amount}</span>
              </div>
              <div class="detail">
                <span class="label">Category:</span>
                <span class="value">${expense.category}</span>
              </div>
              <div class="detail">
                <span class="label">Merchant:</span>
                <span class="value">${expense.merchant_name || 'N/A'}</span>
              </div>
              <div class="detail">
                <span class="label">Date:</span>
                <span class="value">${new Date(expense.expense_date).toLocaleDateString()}</span>
              </div>
              <div class="detail">
                <span class="label">Approval Timestamp:</span>
                <span class="value">${new Date().toLocaleString()}</span>
              </div>

              ${expense.rejection_reason ? `
                <div style="background-color: #fee2e2; padding: 15px; border-radius: 6px; margin-top: 15px;">
                  <div class="label">Rejection Reason:</div>
                  <div style="color: #991b1b; margin-top: 5px;">${expense.rejection_reason}</div>
                </div>
              ` : ''}

              <a href="${process.env.NEXT_PUBLIC_APP_URL}/expenses/${expenseId}" class="button">View Expense Details</a>

              <div class="footer">
                <p>This is an automated email from WPH Expense Manager.</p>
                <p>© ${new Date().getFullYear()} Westpoint Home. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    // Initialize Resend client
    const resend = new Resend(process.env.RESEND_API_KEY)

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'WPH Expense Manager <noreply@your-domain.com>',
      to: expense.users.email,
      subject,
      html: htmlBody,
    })

    if (error) {
      console.error('Error sending email:', error)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in send-approval-email:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
