import http from 'k6/http';
import { check, sleep } from 'k6';

// k6 Load Testing Options & Stages profiles
export const options = {
  stages: [
    { duration: '10s', target: 10 },  // Ramp up to 10 concurrent users
    { duration: '20s', target: 10 },  // Maintain constant load of 10 users
    { duration: '10s', target: 50 },  // Spike concurrent users load to 50
    { duration: '15s', target: 0 },   // Cool down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<150'], // 95% of requests must complete under 150ms
    http_req_failed: ['rate<0.01'],    // Error rate must be less than 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Scenario 1: Query public catalog products
  const productsResponse = http.get(`${BASE_URL}/api/catalog/products`);
  check(productsResponse, {
    'catalog load status is 200': (r) => r.status === 200,
    'catalog response returns json': (r) => r.headers['Content-Type'].includes('application/json'),
  });
  sleep(1);

  // Scenario 2: Simulate cart additions checkout payload submission
  const checkoutPayload = JSON.stringify({
    email: "load_test_customer@example.com",
    shippingAddress: {
      name: "Alice LoadRunner",
      street: "123 Performance Lane",
      city: "Loadville",
      state: "CA",
      zip: "90210",
      country: "USA"
    },
    billingAddress: {
      name: "Alice LoadRunner",
      street: "123 Performance Lane",
      city: "Loadville",
      state: "CA",
      zip: "90210",
      country: "USA"
    },
    shippingMethod: "standard",
    paymentMethod: "cod", // Cash on Delivery requires no payment api verification loops
    useWallet: false
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const checkoutResponse = http.post(`${BASE_URL}/api/catalog/checkout`, checkoutPayload, params);
  
  check(checkoutResponse, {
    'checkout status is 200 or 400': (r) => r.status === 200 || r.status === 400,
  });

  sleep(1.5);
}
