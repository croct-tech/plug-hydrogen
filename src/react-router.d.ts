// Hydrogen augments React Router's load context with `storefront`, `customerAccount`, and `env`
// (see `@shopify/hydrogen/react-router-types`). Pulling it in lets the middleware read those off the
// load context without a cast.
import '@shopify/hydrogen/react-router-types';
