# ZYPHORIZ Backend

Express.js + MongoDB (Mongoose) API for the Nexora local business directory frontend.
Replaces the frontend's `localStorage`-based `AuthContext` and `mockBusinesses.js` with a real database and JWT auth.

## Folder structure

```
backend/
├── src/
│   ├── config/
│   │   ├── db.js            # MongoDB connection
│   │   └── constants.js     # shared constants (referral amount, plan price, default hours)
│   ├── models/
│   │   ├── User.js
│   │   ├── Business.js
│   │   ├── Category.js
│   │   └── Payment.js
│   ├── controllers/
│   │   ├── admin.controller.js
│   │   ├── auth.controller.js
│   │   ├── business.controller.js
│   │   ├── category.controller.js
│   │   ├── payment.controller.js
│   │   └── user.controller.js
│   ├── routes/
│   │   ├── admin.routes.js
│   │   ├── auth.routes.js
│   │   ├── business.routes.js
│   │   ├── category.routes.js
│   │   ├── payment.routes.js
│   │   └── user.routes.js
│   ├── middleware/
│   │   ├── auth.middleware.js    # protect / optionalAuth / restrictTo
│   │   ├── error.middleware.js   # centralized error handler
│   │   └── upload.middleware.js  # multer banner + gallery uploads
│   ├── utils/
│   │   ├── createAdmin.js         # one-time local administrator bootstrap
│   │   ├── ApiError.js
│   │   ├── apiResponse.js
│   │   ├── generateToken.js
│   │   ├── slugify.js
│   │   ├── referralCode.js
│   │   └── seed.js               # seeds the categories collection
│   ├── app.js                    # express app (middleware + routes)
│   └── server.js                 # entrypoint, connects DB and listens
├── uploads/                       # legacy local upload folders (not used in production)
├── .env.example
└── package.json
```

## Setup

```bash
cd backend
npm install
cp .env.example .env      # then fill in your local credentials
npm run seed               # loads the 10 default categories into MongoDB
npm run dev                # starts on http://localhost:5000 with nodemon
```

Requires a running MongoDB instance (local or Atlas) — set `MONGO_URI` accordingly.
Business banner and gallery images are uploaded to Cloudinary. Set `CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in `.env` before using the business image fields.

### Nginx image uploads

The frontend compresses selected business images to WebP (up to 1920 pixels on the longest side)
before upload when that reduces their size. The API accepts a banner and up to six gallery images,
each up to 5 MB after compression. If Nginx sits in front of the API, its default request-body
limit can reject these multipart requests before they reach Express; the resulting proxy error may
appear in the browser as a network or CORS error.

Include `deploy/nginx-upload-size.conf` inside the API's Nginx `server` block, then validate and
reload Nginx:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

This sets a 40 MB request limit to accommodate all supported images and multipart form fields,
and allows up to three minutes for slow image uploads and Cloudinary processing to complete.

For Razorpay Test Mode, create test keys in the Razorpay Dashboard and add them to `backend/.env`:

```env
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
```

The frontend opens Razorpay Checkout with the test key, while the backend creates the order and
verifies the returned signature before activating the business. Never expose `RAZORPAY_KEY_SECRET`
to the frontend.

## Auth model

JWT is issued on register/login and sent two ways so it works for both a browser (cookie) and a
mobile/non-cookie client (JSON body):
- `Set-Cookie: token=...` (httpOnly)
- Response body: `{ token: "..." }`

Protected routes accept either the cookie or an `Authorization: Bearer <token>` header.

## API Reference

Base URL: `/api/v1`

### Auth
| Method | Route | Access | Body |
|---|---|---|---|
| POST | `/auth/register` | Public | `{ mobile, email, password }` |
| POST | `/auth/login` | Public | `{ identifier, password }` (identifier = email or mobile) |
| POST | `/auth/forgot-password` | Public | `{ email }` — sends a password reset link if the account exists |
| POST | `/auth/reset-password-token` | Public | `{ token, password }` — resets the password using the emailed token |
| POST | `/auth/send-otp` | Public | `{ email }` — sends a six-digit password-reset OTP |
| POST | `/auth/verify-otp` | Public | `{ email, otp }` — verifies the OTP |
| POST | `/auth/reset-password` | Public | `{ email, otp, newPassword }` — resets the password using the OTP |
| POST | `/auth/logout` | Private | — |
| GET | `/auth/me` | Private | — |

Password reset tokens are single-use and expire after 10 minutes. Configure `SMTP_HOST`,
`SMTP_PORT` (optional; defaults to `587`), `SMTP_SECURE` (`true` for implicit TLS),
`SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, and `PASSWORD_RESET_URL` in the backend environment.
`PASSWORD_RESET_URL` should point to the frontend page that accepts the `token` query parameter.
The production host must allow outbound connections to the configured SMTP host and port.
OTP delivery fails with a gateway error if the SMTP connection cannot be established or mail
cannot be delivered; check the backend logs for the SMTP error code.

### Categories
| Method | Route | Access |
|---|---|---|
| GET | `/categories` | Public |

### Businesses
| Method | Route | Access | Notes |
|---|---|---|---|
| GET | `/businesses` | Public | Query: `q, category, city, verified, topRated, page, limit` |
| GET | `/businesses/slug/:slug` | Public | Public business profile page |
| GET | `/businesses/mine` | Private | Logged-in user's own listings (dashboard) |
| POST | `/businesses` | Private | `multipart/form-data` — text fields + `banner` (1 file) + `gallery` (up to 8 files) |
| PUT | `/businesses/:id` | Private (owner only) | Same shape as POST, all fields optional |
| DELETE | `/businesses/:id` | Private (owner only) | — |

A business is created with `status: "pending_payment"` and only becomes publicly visible
(`status: "active"`) after `/payments/checkout` succeeds — mirroring the frontend's
Create → Payment Checkout → Payment Success flow.

### Payments
| Method | Route | Access | Body |
|---|---|---|---|
| POST | `/payments/order` | Private | `{ businessId }` |
| POST | `/payments/checkout` | Private | `{ businessId, razorpay_order_id, razorpay_payment_id, razorpay_signature }` |
| GET | `/payments/mine` | Private | Payment history for the logged-in user |

`/payments/order` creates a Razorpay order for the standard plan. `/payments/checkout` verifies
the Razorpay signature and confirms the captured payment with Razorpay before activating the
business, setting a 1-year `planExpiresAt`, and paying the configured referral commission to the
owner of `referralCodeUsed` (if any).

### Users
| Method | Route | Access |
|---|---|---|
| GET | `/users/referrals` | Private — returns `{ referralCode, referralEarnings, referralCount }` |

### Admin
All admin routes require a JWT for a user whose `role` is `admin`. List endpoints accept
`q`, `page`, and `limit` (default 20, maximum 100) and return a `pagination` object.

| Method | Route | Access | Notes |
|---|---|---|---|
| POST | `/admin/login` | Public | `{ identifier, password }` (identifier = email or mobile); only existing admin accounts can sign in |
| GET | `/admin/users` | Admin | Search by email, mobile, or role |
| GET | `/admin/businesses` | Admin | Search by name, category, city, contact, or slug; optional `status` filter |
| PATCH | `/admin/businesses/:id` | Admin | Update only `{ status }`, `{ verified }`, or both |

Admin login issues a JWT only when the matching account already has `role: "admin"`;
do not make a public registration path assign the admin role. The admin app uses
`POST /admin/login` and stores the returned JWT for protected admin API requests.
For local development, the admin app runs on `http://localhost:5174` and reads its API base
URL from `admin/.env` (`VITE_API_URL=http://localhost:5000/api/v1`). In production, set
`VITE_API_URL` to the deployed API base and include the admin app's origin in backend `CLIENT_URL`
or `FRONTEND_URL` (comma-separated values are supported). The main frontend's login page links
to the admin app; set its `VITE_ADMIN_URL` to the deployed admin app URL (defaults to
`http://localhost:5174` during local development and `/admin` in production).

To promote an existing account to administrator, set its email in `backend/.env` and run the
bootstrap command. The existing account's mobile and password are left unchanged:

```env
ADMIN_EMAIL=admin@example.com
```

```bash
cd backend
npm run admin:create
```

If no account matches `ADMIN_EMAIL`, the command can create a new one when `ADMIN_MOBILE` and
`ADMIN_PASSWORD` (at least 12 characters) are also set. The password is hashed using the normal
user model hook, and an already-used mobile is rejected. After setup, remove any `ADMIN_*` values
from `backend/.env`. Existing account passwords are left unchanged by default. To explicitly set
the existing administrator's password to `ADMIN_PASSWORD`, run:

```bash
cd backend
npm run admin:create -- --reset-password
```

The reset option requires a password of at least 12 characters and uses the normal user model
password-hashing hook. Then remove the `ADMIN_*` values from `backend/.env` and sign in with the
account's email and new password. This bootstrap is a local CLI command; it does not add a public
admin registration API.

## Frontend integration notes

To wire this up to the existing React app:
1. Replace `AuthContext`'s localStorage calls with `fetch`/`axios` calls to `/auth/register`,
   `/auth/login`, `/auth/me`, storing the returned JWT (or relying on the httpOnly cookie).
2. Replace `mockBusinesses.js` helpers (`getAllBusinesses`, `findMockBusiness`, `saveMockBusiness`,
   `deleteMockBusiness`) with calls to `/businesses`, `/businesses/slug/:slug`, POST/PUT/DELETE
   `/businesses/:id`.
3. In `CreateBusiness.jsx`, submit the form as `FormData` (so file inputs go straight through)
   instead of storing File objects in `RegistrationContext` + localStorage.
4. In `PaymentCheckout.jsx`, replace `saveMockBusiness` + `awardReferralCommission` with a single
   `POST /payments/checkout` call once the business has been created.
5. Set `VITE_API_URL` in the frontend's `.env` and point all requests at it (e.g.
   `http://localhost:5000/api/v1`).
