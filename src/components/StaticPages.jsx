import { useState } from "react";
import { submitInquiry } from "../api.js";

export function AboutPage({ onNavigate }) {
  return (
    <div className="static-page-container">
      <div className="static-page-header">
        <span className="eyebrow">WHO WE ARE</span>
        <h1>About Vdecore Wholesale B2B</h1>
        <p>A trusted manufacturing and wholesale distribution partner for businesses across India.</p>
      </div>

      <div className="static-page-body">
        <section className="about-section">
          <h2>Our B2B Supply Mission</h2>
          <p>
            Vdecore Wholesale was founded to bridge the gap between quality manufacturing and modern retailers, corporate buyers, and institutional clients. We eliminate multiple distributor margins by supplying verified products directly from origin.
          </p>
          <div className="about-grid">
            <div className="about-card">
              <span className="about-icon">🏭</span>
              <h3>Factory Direct Pricing</h3>
              <p>Transparent wholesale tiers with no hidden markups. Volume discounts engineered for your bottom line.</p>
            </div>
            <div className="about-card">
              <span className="about-icon">📦</span>
              <h3>Low Minimum Order Quantities</h3>
              <p>Accessible MOQs designed to help growing retailers test new catalogue lines without capital lock-in.</p>
            </div>
            <div className="about-card">
              <span className="about-icon">🚚</span>
              <h3>Reliable Freight Network</h3>
              <p>Tie-ups with leading cargo and surface logistics providers ensure insured dispatch to over 19,000 pincodes.</p>
            </div>
          </div>
        </section>

        <section className="about-cta-box">
          <h3>Partner with Vdecore for your wholesale needs</h3>
          <p>Reach out to discuss custom catalogue sourcing, OEM packaging, or credit facility terms.</p>
          <button
            type="button"
            className="primary-button"
            onClick={() => onNavigate("contact")}
          >
            Contact Commercial Desk →
          </button>
        </section>
      </div>
    </div>
  );
}

export function ContactPage() {
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await submitInquiry({
        companyName: companyName.trim() || "Inquiry",
        contactName: contactName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        message: message.trim(),
      });
      if (res.success) {
        setSent(true);
      } else {
        setErrorMsg(res.error || "Failed to send inquiry");
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to send inquiry");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="static-page-container">
      <div className="static-page-header">
        <span className="eyebrow">COMMERCIAL DESK</span>
        <h1>Contact Our Wholesale Team</h1>
        <p>Get in touch for custom bulk quotes, GST proforma inquiries, or supply partnerships.</p>
      </div>

      <div className="contact-layout">
        <div className="contact-info-panel">
          <div className="contact-info-card">
            <h3>Registered Warehouse & Office</h3>
            <p>
              Vdecore Wholesale Hub<br />
              Industrial Estate, Phase II<br />
              India
            </p>
          </div>

          <div className="contact-info-card">
            <h3>Direct Contact</h3>
            <p><strong>Email:</strong> wholesale@vdecore.com</p>
            <p><strong>Inquiry Line:</strong> +91 98765 43210</p>
            <p><strong>Hours:</strong> Mon - Sat: 9:30 AM – 6:30 PM IST</p>
          </div>

          <div className="contact-info-card">
            <h3>GST & Invoicing</h3>
            <p>
              All orders are accompanied by official GST tax invoices compliant with Indian tax laws. Valid GSTIN required at checkout for input tax credit claims.
            </p>
          </div>
        </div>

        <div className="contact-form-panel">
          {sent ? (
            <div className="contact-success-card">
              <span className="check-icon">✓</span>
              <h3>Message Sent Successfully!</h3>
              <p>Our commercial desk has received your note. A key account manager will contact you within 24 business hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="contact-form">
              <h3>Send an Inquiry</h3>
              {errorMsg && <div className="cart-error-banner">{errorMsg}</div>}

              <div className="form-group">
                <label htmlFor="ctCompany">Company Name *</label>
                <input
                  id="ctCompany"
                  required
                  placeholder="e.g. Reliance Trading Co."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="ctContact">Contact Person *</label>
                <input
                  id="ctContact"
                  required
                  placeholder="e.g. Sunita Rao"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="ctEmail">Email Address *</label>
                  <input
                    id="ctEmail"
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="ctPhone">Phone Number</label>
                  <input
                    id="ctPhone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="ctMessage">Message / Supply Requirement *</label>
                <textarea
                  id="ctMessage"
                  required
                  rows={4}
                  placeholder="Tell us about the products, quantities, and timelines you need..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="primary-button full-button"
                disabled={submitting}
              >
                {submitting ? "Sending..." : "Submit Inquiry →"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export function FAQPage() {
  const faqs = [
    {
      q: "What is Minimum Order Quantity (MOQ)?",
      a: "MOQ is the minimum quantity of a single product SKU required to place a wholesale order. Each product card clearly specifies its MOQ. Orders cannot be submitted below this threshold.",
    },
    {
      q: "How does payment work for wholesale orders?",
      a: "We operate on a verified proforma invoice model. When you submit an order, no instant online payment is deducted. Our sales desk reviews stock availability and freight costs, then generates an official GST Proforma Invoice with Bank RTGS/NEFT payment details.",
    },
    {
      q: "Can I get GST input tax credit for my business?",
      a: "Yes. All commercial orders are supplied with a tax invoice bearing our GSTIN and your business GSTIN (if provided in your order notes). You can claim full ITC under GST guidelines.",
    },
    {
      q: "Do you offer sample orders before placing large bulk orders?",
      a: "Yes. For serious corporate inquiries, you can submit a quotation inquiry or contact our desk to arrange product sample dispatches.",
    },
    {
      q: "What is the expected delivery timeframe?",
      a: "Ready stock orders are typically dispatched within 24 to 48 hours of invoice payment confirmation. Surface freight transit varies between 3 to 7 business days depending on destination pincode.",
    },
    {
      q: "Do you ship pan-India?",
      a: "Yes, we partner with major express logistics and surface freight carriers covering all major commercial industrial centers and pin codes across India.",
    },
  ];

  return (
    <div className="static-page-container">
      <div className="static-page-header">
        <span className="eyebrow">HELP & SUPPORT</span>
        <h1>Wholesale Frequently Asked Questions</h1>
        <p>Common questions about ordering, minimums, invoicing, and logistics.</p>
      </div>

      <div className="faq-list">
        {faqs.map((item, index) => (
          <div className="faq-card" key={index}>
            <h3>{item.q}</h3>
            <p>{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ShippingPage() {
  return (
    <div className="static-page-container">
      <div className="static-page-header">
        <span className="eyebrow">LOGISTICS & FREIGHT</span>
        <h1>Shipping & Dispatch Policy</h1>
        <p>Details on bulk shipping methods, timelines, and carrier tracking.</p>
      </div>

      <div className="policy-content">
        <h2>1. Warehouse Dispatch Timelines</h2>
        <p>
          All orders for in-stock catalogue items are processed within 24–48 business hours after proforma invoice clearance. For customized or OEM production orders, timelines are agreed upon during quotation confirmation.
        </p>

        <h2>2. Freight & Transportation Modes</h2>
        <p>
          Depending on the consignment volume and weight, we utilize:
        </p>
        <ul>
          <li><strong>Surface Cargo & Part-Truckload (PTL):</strong> For bulk cartons and palletized shipments over 50 kg.</li>
          <li><strong>Full Truckload (FTL):</strong> Dedicated vehicles arranged for large corporate or institutional supply contracts.</li>
          <li><strong>Express Air / Surface Couriers:</strong> For urgent smaller wholesale packages and initial production samples.</li>
        </ul>

        <h2>3. Freight Charges & Delivery Terms</h2>
        <p>
          Unless explicitly quoted as CIF/Free Delivery in quotation terms, freight charges are billed on the proforma invoice or booked "To-Pay" via the customer&apos;s preferred transporter.
        </p>

        <h2>4. Consignment Tracking</h2>
        <p>
          Once dispatched, our logistics desk provides the transporter name, docket/LR number, and online tracking link so you can monitor your consignment in real time.
        </p>
      </div>
    </div>
  );
}

export function ReturnsPage() {
  return (
    <div className="static-page-container">
      <div className="static-page-header">
        <span className="eyebrow">CLAIMS & INSPECTION</span>
        <h1>Wholesale Returns & Damage Policy</h1>
        <p>Guidelines for B2B inspection, transit claims, and replacements.</p>
      </div>

      <div className="policy-content">
        <h2>1. B2B Wholesale Inspection Window</h2>
        <p>
          Because we sell in commercial wholesale volumes, orders are not subject to retail &quot;change-of-mind&quot; returns. All consignments must be inspected by the buyer within 48 hours of delivery receipt.
        </p>

        <h2>2. Transit Damage & Discrepancy Claims</h2>
        <p>
          In the rare event of transit damage or quantity discrepancies:
        </p>
        <ul>
          <li>Note the condition on the transporter delivery receipt (Proof of Delivery / POD).</li>
          <li>Take clear photographs and an unboxing video of the sealed cartons and affected goods.</li>
          <li>Email our claims desk at wholesale@vdecore.com within 48 hours referencing your Order Number.</li>
        </ul>

        <h2>3. Replacement & Credit Notes</h2>
        <p>
          Verified manufacturing defects or transit damage will be rectified promptly through free replacement dispatches or credit notes adjustment against future orders.
        </p>
      </div>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <div className="static-page-container">
      <div className="static-page-header">
        <span className="eyebrow">DATA PROTECTION</span>
        <h1>Privacy & Business Data Policy</h1>
        <p>How we handle business information, contact details, and transaction privacy.</p>
      </div>

      <div className="policy-content">
        <h2>1. Information Collected</h2>
        <p>
          We collect company name, contact person name, business email, telephone numbers, shipping addresses, and GSTIN information solely for fulfilling wholesale quotations, processing invoices, and executing deliveries.
        </p>

        <h2>2. Data Confidentiality</h2>
        <p>
          We do not sell, rent, or lease buyer lists or commercial pricing terms to third-party marketing companies. Information is shared strictly with necessary operational partners (such as logistics carriers for dispatch).
        </p>

        <h2>3. Security & Access</h2>
        <p>
          All admin management interfaces are secured with encrypted session tokens, rate limiting, and PBKDF2 password hashing. Database connections are executed through encrypted Cloudflare D1 channels.
        </p>
      </div>
    </div>
  );
}

export function TermsPage() {
  return (
    <div className="static-page-container">
      <div className="static-page-header">
        <span className="eyebrow">COMMERCIAL AGREEMENT</span>
        <h1>Terms & Conditions of Wholesale Supply</h1>
        <p>Standard terms governing all B2B transactions with Vdecore.</p>
      </div>

      <div className="policy-content">
        <h2>1. Wholesale Quotations & Price Validity</h2>
        <p>
          Quotations issued by our commercial desk are valid for 7 calendar days from the date of issue unless otherwise specified in writing. Raw material market price fluctuations may necessitate updated quotation terms thereafter.
        </p>

        <h2>2. Order Acceptance</h2>
        <p>
          Submission of an order through this portal constitutes a formal purchase inquiry. A binding contract is formed upon the issuance of an official Proforma Invoice and confirmation of receipt of payment.
        </p>

        <h2>3. Taxes & Government Duties</h2>
        <p>
          All catalog prices are listed exclusive of GST unless explicitly stated otherwise. Applicable GST rates (5%, 12%, or 18% as per product HSN code) are added to the proforma invoice.
        </p>

        <h2>4. Governing Law & Jurisdiction</h2>
        <p>
          All transactions are governed under Indian commercial laws, and any disputes shall be subject to the exclusive jurisdiction of the competent courts in India.
        </p>
      </div>
    </div>
  );
}
