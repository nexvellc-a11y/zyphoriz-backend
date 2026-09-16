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
│   │   ├── auth.controller.js
│   │   ├── business.controller.js
│   │   ├── category.controller.js
│   │   ├── payment.controller.js
│   │   └── user.controller.js
│   ├── routes/
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
| POST | `/auth/logout` | Private | — |
| GET | `/auth/me` | Private | — |

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
| POST | `/payments/checkout` | Private | `{ businessId, method, razorpay_order_id, razorpay_payment_id, razorpay_signature }` |
| GET | `/payments/mine` | Private | Payment history for the logged-in user |

`/payments/order` creates a Razorpay order for the standard plan. `/payments/checkout` verifies
the Razorpay signature, then activates the business, sets a 1-year `planExpiresAt`, and pays a
₹50 referral commission to the owner of `referralCodeUsed` (if any).

### Users
| Method | Route | Access |
|---|---|---|
| GET | `/users/referrals` | Private — returns `{ referralCode, referralEarnings, referralCount }` |

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
