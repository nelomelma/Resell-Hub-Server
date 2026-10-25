
# ReSell Hub Backend Deployment Guide

## Environment Variables

Copy `.env.example` to `.env` for local development.

Configure these variables in the hosting provider's environment settings for production:

- `PORT`: Server port (the hosting provider may assign this automatically).
- `MONGODB_URI`: MongoDB connection string.
- `DB_NAME`: MongoDB database name.
- `JWT_SECRET`: Secret used to sign authentication tokens.
- `CLIENT_URL`: Deployed frontend URL allowed by CORS.
- `STRIPE_SECRET_KEY`: Stripe secret key for payment integration.
- `BETTER_AUTH_SECRET`: Authentication secret, if required.
- `BETTER_AUTH_URL`: Public backend URL, if required.
- `GOOGLE_CLIENT_ID`: Google OAuth client ID.
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret.

## Deployment Steps

1. Push the server repository to GitHub.
2. Create a Node.js web service on the hosting platform.
3. Connect the GitHub server repository.
4. Install dependencies using `npm install`.
5. Set the start command to `npm start`.
6. Configure the required environment variables.
7. Deploy the service.
8. Verify the health endpoint at `/api/health`.

## Frontend Connection

Set the frontend's `VITE_API_URL` to:

`https://YOUR-BACKEND-DOMAIN/api`

Set the backend's `CLIENT_URL` to:

`https://YOUR-FRONTEND-DOMAIN`

## Security

- Never commit `.env` or real API secrets to Git.
- Use a strong, unique JWT secret.
- Keep production credentials in the hosting provider's environment settings.
- Test authentication, products, and payment features after deployment.
