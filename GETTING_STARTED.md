# Getting Started with WPH Expense Manager

## Quick Start

1. **Install dependencies**
   ```bash
   cd wph-expense-manager
   npm install
   ```

2. **Set up Supabase**
   - Create a free account at https://supabase.com
   - Create a new project
   - Run the SQL in `supabase-schema.sql` in the SQL Editor
   - Get your project URL and anon key from Project Settings > API

3. **Configure environment**
   ```bash
   cp .env.local.example .env.local
   ```
   Update with your Supabase credentials.

4. **Run development server**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000

5. **Create first user**
   - Sign up through the app
   - In Supabase Dashboard > Table Editor > users, set your role to "admin"

## Key Features Implemented

### ✅ Phase 1 MVP (Complete)

1. **Authentication**
   - Email/password signup and login
   - No approval needed for signup
   - Supabase Auth integration
   - Protected routes via middleware

2. **Expense Entry**
   - Receipt camera capture
   - Client-side image compression (<500KB)
   - OCR text extraction (amount, date, merchant)
   - Auto-populated form fields
   - Multi-currency support (USD, BHD, AED, EUR, PKR, INR, CAD, GBP)
   - Location detection (EXIF + browser geolocation)
   - Draft and submit functionality

3. **Trip Management**
   - Create trips with start/end dates
   - Link expenses to trips
   - View trip summaries

4. **Manager Approval**
   - One-click approve/reject
   - Rejection reason required
   - Email notifications via Resend
   - Pending approvals dashboard

5. **User Management (Admin)**
   - View all users in table
   - Assign managers via dropdown
   - Role-based access control

6. **Mobile-First UI**
   - Bottom navigation bar
   - Floating Action Button (FAB)
   - Responsive design
   - Dark mode support
   - Skeleton loaders

7. **Dashboard**
   - Monthly spending total
   - Pending/approved/draft counts
   - Recent expenses list
   - Manager pending approvals

## Architecture Highlights

### Performance
- **React Server Components**: Fast initial page loads
- **Web Workers**: OCR runs in background, non-blocking
- **Optimistic Updates**: Instant UI feedback
- **Indexed Queries**: Sub-100ms database responses
- **Image Compression**: Client-side before upload

### Security
- **Row Level Security (RLS)**: Supabase enforces access control
- **Private Storage**: Receipt URLs require authentication
- **Role-based Access**: Employee, Manager, Admin roles
- **Secure Auth**: Supabase handles authentication

### Data Flow

1. **Employee submits expense**:
   - Take photo → compress → extract EXIF → run OCR → upload to storage
   - Create expense record with status "pending"
   - Manager receives notification on dashboard

2. **Manager approves**:
   - Click approve → update status → send email
   - Employee receives email notification

3. **Location detection priority**:
   - EXIF GPS from image (if available)
   - Browser geolocation (fallback)
   - Manual entry (if both fail)

## Next Steps

### Before Production

1. **Set up Resend**
   - Sign up at https://resend.com
   - Verify your domain
   - Update `from` email in `app/api/send-approval-email/route.ts`

2. **Update environment variables**
   - Set production URL in `NEXT_PUBLIC_APP_URL`
   - Secure all API keys

3. **Test workflows**
   - Create test users for each role
   - Test expense submission → approval → email flow
   - Verify RLS policies work correctly

4. **Deploy to Vercel**
   - Push to GitHub
   - Import in Vercel
   - Add environment variables
   - Deploy!

### Phase 2 Features (Optional)

- [ ] Offline support (PWA)
- [ ] Advanced analytics (charts, trends)
- [ ] Bulk expense import (CSV)
- [ ] Budget tracking per category
- [ ] Custom expense categories
- [ ] Receipt text search
- [ ] Export to PDF/Excel
- [ ] Mobile app (React Native)

## Common Workflows

### As an Employee

```
1. Open app → Dashboard
2. Click FAB (+) button
3. Take receipt photo
4. Wait for OCR (shows progress)
5. Verify auto-filled fields
6. Select category and currency
7. Click "Submit for Approval"
8. Done! Manager is notified
```

### As a Manager

```
1. Open app → Dashboard
2. See "Pending Approvals" section
3. Click on an expense
4. Review receipt and details
5. Click "Approve" or "Reject"
6. If reject, provide reason
7. Done! Employee receives email
```

### As an Admin

```
1. Open app → Profile
2. Click "User Management"
3. View all users in table
4. Assign managers using dropdown
5. Changes save automatically
```

## Important Files

- `supabase-schema.sql` - Database schema and RLS policies
- `.env.local.example` - Environment variables template
- `lib/supabase/` - Supabase client configuration
- `components/ReceiptUpload.tsx` - OCR and image processing
- `app/api/send-approval-email/route.ts` - Email notifications
- `middleware.ts` - Authentication middleware

## Troubleshooting

**OCR not working?**
- Check browser console for errors
- Ensure `public/ocr-worker.js` exists
- Test with a clear, high-contrast receipt

**Images not uploading?**
- Verify Supabase storage bucket "receipts" exists
- Check RLS policies in Supabase Dashboard > Storage
- Try with a smaller image (<2MB)

**Can't approve expenses?**
- Ensure you're set as the employee's manager
- Check your role is "manager" or "admin"
- Verify RLS policies allow updates

**Email not sending?**
- Check Resend API key is correct
- Verify domain is verified in Resend dashboard
- Check email in spam folder

## Support

For questions or issues:
1. Check the [README.md](./README.md) for detailed docs
2. Review Supabase logs in dashboard
3. Contact system administrator

---

**Congratulations!** You now have a fully functional expense management system. 🎉
