# WPH Expense Manager

A fast, mobile-first expense tracking application for Westpoint Home built with Next.js 14, Supabase, and TailwindCSS.

## Features

### Core Functionality
- **One-tap expense entry** with receipt camera capture
- **Automatic OCR** using Tesseract.js to extract amount, date, and merchant
- **Client-side image compression** (<500KB target)
- **Auto-location detection** from EXIF data or browser geolocation
- **Multi-currency support** (USD, BHD, AED, EUR, PKR, INR, CAD, GBP)
- **Trip management** to group related expenses
- **Manager approval workflow** with one-click approve/reject
- **Email notifications** on approval/rejection using Resend
- **Role-based access** (Employee, Manager, Admin)

### User Roles
- **Employee**: Submit expenses, view own submissions
- **Manager**: Approve/reject team expenses, manage direct reports
- **Admin**: Full system access, user management, assign managers

### Performance Optimizations
- React Server Components for fast initial page load
- Web Workers for non-blocking OCR processing
- Optimistic UI updates
- Skeleton loaders
- Client-side image compression before upload
- Database queries optimized with indexes

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 19, TypeScript
- **Styling**: TailwindCSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **OCR**: Tesseract.js
- **Email**: Resend
- **Deployment**: Vercel
- **Image Processing**: browser-image-compression, ExifReader
- **State Management**: Zustand
- **Date Utilities**: date-fns

## Prerequisites

- Node.js 18+ and npm
- Supabase account ([supabase.com](https://supabase.com))
- Resend account for emails ([resend.com](https://resend.com))
- Vercel account for deployment (optional)

## Setup Instructions

### 1. Clone the repository

```bash
cd wph-expense-manager
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API to get your credentials
3. Copy the SQL schema from `supabase-schema.sql`
4. Run it in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)
5. This will create:
   - Tables: `users`, `expenses`, `trips`
   - Row Level Security (RLS) policies
   - Storage bucket for receipts
   - Indexes for performance

### 3. Configure environment variables

Create a `.env.local` file in the root directory:

```bash
cp .env.local.example .env.local
```

Update the values:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Resend API for Email Notifications
RESEND_API_KEY=re_your_key_here

# App URL (update for production)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Set up Resend

1. Sign up at [resend.com](https://resend.com) (5,000 emails/month free)
2. Verify your domain or use the sandbox domain for testing
3. Get your API key from the dashboard
4. Update `RESEND_API_KEY` in `.env.local`
5. Update the `from` email in `app/api/send-approval-email/route.ts` to use your verified domain

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Create your first user

1. Click "Sign Up"
2. Enter your details (first user defaults to employee role)
3. To make yourself an admin, go to Supabase Dashboard > Table Editor > users
4. Find your user and change `role` to `admin`

## Database Schema

### Users Table
- `id` (UUID, references auth.users)
- `email` (TEXT)
- `full_name` (TEXT)
- `role` (TEXT: employee, manager, admin)
- `manager_id` (UUID, references users)

### Expenses Table
- `id` (UUID)
- `user_id` (UUID, references users)
- `trip_id` (UUID, references trips)
- `amount` (DECIMAL)
- `currency` (TEXT)
- `category` (TEXT)
- `merchant_name` (TEXT)
- `description` (TEXT)
- `expense_date` (DATE)
- `receipt_url` (TEXT)
- `location` (TEXT)
- `gps_coordinates` (JSONB)
- `ocr_data` (JSONB)
- `status` (TEXT: draft, pending, approved, rejected)
- `submitted_at` (TIMESTAMP)
- `approved_at` (TIMESTAMP)
- `approved_by` (UUID)
- `rejection_reason` (TEXT)

### Trips Table
- `id` (UUID)
- `user_id` (UUID)
- `trip_name` (TEXT)
- `destination` (TEXT)
- `start_date` (DATE)
- `end_date` (DATE)
- `status` (TEXT: active, completed, cancelled)
- `submitted_at` (TIMESTAMP)

## Project Structure

```
wph-expense-manager/
├── app/
│   ├── api/
│   │   └── send-approval-email/   # Email notification endpoint
│   ├── auth/
│   │   ├── login/                 # Login page
│   │   ├── signup/                # Signup page
│   │   └── callback/              # Auth callback
│   ├── dashboard/                 # Main dashboard
│   ├── expenses/
│   │   ├── new/                   # Add expense form
│   │   ├── [id]/                  # Expense detail view
│   │   └── page.tsx               # Expenses list
│   ├── trips/
│   │   ├── new/                   # Create trip
│   │   └── page.tsx               # Trips list
│   ├── admin/                     # User management (admin only)
│   ├── profile/                   # User profile
│   └── layout.tsx                 # Root layout
├── components/
│   ├── BottomNav.tsx              # Mobile navigation
│   ├── FAB.tsx                    # Floating action button
│   ├── ReceiptUpload.tsx          # Receipt camera/upload
│   ├── ApprovalActions.tsx        # Approve/reject buttons
│   ├── ManagerAssignment.tsx      # Manager dropdown (admin)
│   └── LogoutButton.tsx           # Logout functionality
├── lib/
│   ├── supabase/                  # Supabase clients
│   │   ├── client.ts              # Browser client
│   │   ├── server.ts              # Server client
│   │   └── middleware.ts          # Auth middleware
│   ├── utils/
│   │   ├── ocr.ts                 # OCR parsing logic
│   │   └── image.ts               # Image compression & EXIF
│   └── database.types.ts          # TypeScript types
├── public/
│   └── ocr-worker.js              # Tesseract.js Web Worker
├── supabase-schema.sql            # Database schema
└── middleware.ts                  # Next.js middleware
```

## Usage Guide

### For Employees

1. **Add an expense**:
   - Click the blue + button (FAB)
   - Take a photo of your receipt
   - OCR automatically extracts amount, date, merchant
   - Verify/edit the details
   - Optionally link to a trip
   - Submit for approval or save as draft

2. **Create a trip**:
   - Go to Trips tab
   - Click "+ New Trip"
   - Enter trip details
   - Link expenses when creating them

3. **Track status**:
   - View all expenses in Expenses tab
   - Check dashboard for quick stats

### For Managers

1. **Approve expenses**:
   - See pending approvals on dashboard
   - Click on an expense
   - Review details and receipt
   - Click "Approve" or "Reject" (with reason)
   - Employee receives email notification

2. **View team expenses**:
   - Dashboard shows all team pending approvals
   - Can filter by employee or date range

### For Admins

1. **Manage users**:
   - Go to Profile > User Management
   - View all users in a table
   - Assign managers using dropdown
   - Change user roles directly in Supabase

2. **System overview**:
   - Access all expenses and trips
   - Monitor approval trends
   - Export data from Supabase

## Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables from `.env.local`
4. Deploy!

### Update environment variables

After deployment, update:
```env
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

### Configure Resend

Update the email sender in `app/api/send-approval-email/route.ts`:
```typescript
from: 'WPH Expense Manager <noreply@your-verified-domain.com>',
```

## Performance Notes

- Images are compressed to <500KB before upload
- OCR runs in Web Worker (non-blocking)
- Database queries use indexes for <100ms response
- Optimistic UI updates for instant feedback
- Skeleton loaders prevent blank screens
- React Server Components for fast page loads

## Currency Support

The app supports the following currencies:
- USD (US Dollar) - $
- BHD (Bahraini Dinar) - BD
- AED (UAE Dirham) - د.إ
- EUR (Euro) - €
- PKR (Pakistani Rupee) - ₨
- INR (Indian Rupee) - ₹
- CAD (Canadian Dollar) - C$
- GBP (British Pound) - £

## Security

- Row Level Security (RLS) enforced in Supabase
- Employees can only view/edit their own expenses
- Managers can only approve their reports' expenses
- Admins have full access
- Receipt storage is private by default
- Authentication handled by Supabase Auth

## Troubleshooting

### OCR not working
- Ensure `/ocr-worker.js` is in the `public` folder
- Check browser console for errors
- Tesseract.js loads from CDN, check network tab

### Images not uploading
- Verify Supabase storage bucket `receipts` exists
- Check RLS policies allow uploads
- Ensure file size is reasonable (<5MB)

### Email not sending
- Verify Resend API key is correct
- Check domain is verified in Resend
- For production, update `from` email address

### Database connection issues
- Verify Supabase URL and anon key
- Check RLS policies aren't blocking queries
- Review Supabase logs in dashboard

## Future Enhancements (Phase 2-3)

- [ ] Offline support (PWA)
- [ ] Bulk expense import (CSV)
- [ ] Advanced analytics dashboard
- [ ] Receipt text search
- [ ] Budget tracking
- [ ] Expense categories customization
- [ ] Multi-language support
- [ ] Dark mode toggle
- [ ] Export to PDF/Excel

## License

Proprietary - Westpoint Home

## Support

For issues or questions, contact your system administrator.
