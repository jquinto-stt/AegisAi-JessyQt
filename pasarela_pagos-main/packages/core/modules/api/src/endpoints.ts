import { Path, Method } from '@webiai/sdk.http';

namespace EP {
  //!PATH - Root
  export const Root$ = new Path('/');

  //?ENDPOINT - Health check
  export const $Health = Root$.sub('/health').endpoint(Method.GET);

  //!PATH - Payment orders
  export const PaymentOrders$ = Root$.sub('/payment-orders');

  //?ENDPOINT - Create a payment order (payment link) to send by WhatsApp
  export const $CreatePaymentOrder = PaymentOrders$.endpoint(Method.POST);

  //?ENDPOINT - List all persisted payment orders (with refreshed status)
  export const $ListPaymentOrders = PaymentOrders$.endpoint(Method.GET);

  //!PATH - A single payment order by id
  export const PaymentOrderById$ = PaymentOrders$.sub({ paymentOrderId: 'paymentOrderId' }, () => '/:paymentOrderId');

  //?ENDPOINT - Get the status of a payment order
  export const $GetPaymentOrder = PaymentOrderById$.endpoint(Method.GET);

  //!PATH - Subscriptions
  export const Subscriptions$ = Root$.sub('/subscriptions');

  //?ENDPOINT - Create a subscription (token with payment -> CreateSubscription)
  export const $CreateSubscription = Subscriptions$.endpoint(Method.POST);

  //?ENDPOINT - List all persisted subscriptions
  export const $ListSubscriptions = Subscriptions$.endpoint(Method.GET);

  //!PATH - Subscription embedded-form (Krypton) flow
  export const SubscriptionFormToken$ = Subscriptions$.sub('/form-token');

  //?ENDPOINT - Create a formToken to render the embedded card form (REGISTER_PAY)
  export const $SubscriptionFormToken = SubscriptionFormToken$.endpoint(Method.POST);

  //!PATH - Confirm a subscription after the buyer paid in the embedded form
  export const SubscriptionConfirm$ = Subscriptions$.sub('/confirm');

  //?ENDPOINT - Validate the payment signature + create the subscription
  export const $ConfirmSubscription = SubscriptionConfirm$.endpoint(Method.POST);

  //!PATH - A single subscription's PayZen details by id
  export const SubscriptionDetails$ = Subscriptions$.sub({ subscriptionId: 'subscriptionId' }, () => '/:subscriptionId/details');

  //?ENDPOINT - Fetch a subscription's scheduled details from PayZen
  export const $SubscriptionDetails = SubscriptionDetails$.endpoint(Method.GET);
}

export default EP;
