import React from "react";
import "./CSS/Policy.css";

const ShippingPolicy = () => {
  return (
    <div className="policy-container">
      <h1>Shipping & Delivery Policy</h1>
      <p className="last-updated">📅 Last updated on Aug 30th 2025</p>

      <p>
        Orders are shipped within <strong>0–7 days</strong> or as per the
        delivery date agreed at the time of order confirmation and delivery of
        the shipment, subject to courier company / post office norms.
      </p>

      <p>
        <strong>ECOMMERCE SHOPPING PRIVATE LTD</strong> is not liable for any delay
        in delivery by the courier company / postal authorities and only
        guarantees to hand over the consignment to the courier company or postal
        authorities within <strong>0–7 days</strong> from the date of the order
        and payment or as per the delivery date agreed at the time of order
        confirmation.
      </p>

      <p>
        Delivery of all orders will be to the address provided by the buyer.
        Delivery of our services will be confirmed on your registered email ID.
      </p>

      <p>
        For any issues in utilizing our services, you may contact our helpdesk
        on <strong>123456789</strong> or{" "}
        <strong>example@gmail.com</strong>.
      </p>
    </div>
  );
};

export default ShippingPolicy;
