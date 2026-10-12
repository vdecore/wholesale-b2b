import { useState } from "react";
import { submitInquiry } from "../api.js";

export default function InquiryModal({
  isOpen,
  onClose,
  initialProduct = null,
  initialQty = null,
}) {
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [productInterest, setProductInterest] = useState(
    initialProduct ? `${initialProduct.name} (${initialProduct.sku})` : ""
  );
  const [requestedQuantity, setRequestedQuantity] = useState(
    initialQty || (initialProduct ? initialProduct.moq : "")
  );
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMessage({ text: "", type: "" });

    try {
      const payload = {
        companyName: companyName.trim(),
        contactName: contactName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        productInterest: productInterest.trim() || null,
        requestedQuantity: requestedQuantity ? Number(requestedQuantity) : null,
        message: message.trim() || null,
      };

      const res = await submitInquiry(payload);
      if (res.success) {
        setStatusMessage({
          text: "Thank you! Your wholesale inquiry has been submitted. Our commercial desk will contact you within 24 business hours.",
          type: "success",
        });
      } else {
        setStatusMessage({
          text: res.error || "Failed to submit inquiry. Please try again.",
          type: "error",
        });
      }
    } catch (err) {
      setStatusMessage({
        text: err.message || "An error occurred while submitting inquiry.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="inquiry-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inquiry-title"
      >
        <button
          type="button"
          className="close-button inq-close-btn"
          onClick={onClose}
          aria-label="Close dialog"
        >
          ×
        </button>

        <span className="eyebrow">DIRECT WHOLESALE QUOTATION</span>
        <h2 id="inquiry-title">Request Bulk Quotation</h2>
        <p className="inquiry-subtitle">
          Submit your product requirements. We supply verified wholesale quantities with GST tax invoice and nationwide door delivery.
        </p>

        {statusMessage.text ? (
          <div className={`inquiry-alert-box ${statusMessage.type}`}>
            <p>{statusMessage.text}</p>
            {statusMessage.type === "success" && (
              <button
                type="button"
                className="primary-button full-button"
                style={{ marginTop: "16px" }}
                onClick={onClose}
              >
                Close
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="inquiry-form">
            <div className="form-group">
              <label htmlFor="inqCompany">Company / Business Name *</label>
              <input
                id="inqCompany"
                required
                placeholder="e.g. Apex Global Supplies"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="inqContact">Contact Person *</label>
              <input
                id="inqContact"
                required
                placeholder="e.g. Vikram Sharma"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="inqEmail">Business Email *</label>
                <input
                  id="inqEmail"
                  type="email"
                  required
                  placeholder="name@business.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="inqPhone">Phone / WhatsApp</label>
                <input
                  id="inqPhone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="inqProduct">Product of Interest</label>
                <input
                  id="inqProduct"
                  placeholder="e.g. Cotton T-Shirts, Custom Packaging"
                  value={productInterest}
                  onChange={(e) => setProductInterest(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="inqQty">Approx. Order Quantity</label>
                <input
                  id="inqQty"
                  type="number"
                  min="1"
                  placeholder="e.g. 500"
                  value={requestedQuantity}
                  onChange={(e) => setRequestedQuantity(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="inqMessage">Requirements & Specific Details</label>
              <textarea
                id="inqMessage"
                rows={3}
                placeholder="Include customizations, desired delivery destination, or target timeline..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <div className="form-actions-row">
              <button
                type="button"
                className="secondary-btn"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={submitting}
              >
                {submitting ? "Sending..." : "Submit Quotation Request"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
