import { notFound } from "next/navigation";
import { CircleCheckBig, Download, Hourglass, Recycle } from "lucide-react";
import { getInvoice } from "@/lib/services/invoiceService";
import { BackButton } from "@/components/BackButton";

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default async function InvoicePage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  const invoice = await getInvoice(token);
  if (!invoice) {
    notFound();
  }

  const { isPaid, payment, seller, buyer } = invoice;

  return (
    <main className="inv-screen">
      <article className="card inv-card">
        <header className={`inv-head ${isPaid ? "is-paid" : "is-pending"}`}>
          {isPaid ? <CircleCheckBig size={40} aria-hidden="true" /> : <Hourglass size={36} aria-hidden="true" />}
          <div style={{ minWidth: 0 }}>
            <h1 className="inv-status">{isPaid ? "Payment successful" : "Payment pending"}</h1>
            <div className="inv-sub">{isPaid ? "भुगतान सफल" : "भुगतान बाकी"}</div>
          </div>
          <div className="inv-amount">{rupees(invoice.amountPaise)}</div>
        </header>

        <div className="inv-meta">
          <span className="inv-brand">
            <Recycle size={15} aria-hidden="true" /> Invoice {invoice.lotRef}
          </span>
          <span>
            {payment && `${payment.method} · ${payment.reference} · `}
            {invoice.issuedAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
          </span>
        </div>

        <table className="inv-table">
          <thead>
            <tr>
              <th scope="col">Material</th>
              <th scope="col">Weight</th>
              <th scope="col">Rate</th>
              <th scope="col">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line) => (
              <tr key={line.categoryId}>
                <td>{line.nameEn}</td>
                <td>{(line.weightGrams / 1000).toFixed(1)} kg</td>
                <td>{rupees(line.ratePerKgPaise)}</td>
                <td>{rupees(line.amountPaise)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td>{(invoice.totalWeightGrams / 1000).toFixed(1)} kg</td>
              <td />
              <td>{rupees(invoice.amountPaise)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="inv-parties">
          <section>
            <h2>Seller</h2>
            <strong>{seller.name}</strong>
            <span>{seller.phone}</span>
            <span>{seller.area}</span>
          </section>
          <section>
            <h2>Buyer</h2>
            <strong>{buyer.name}</strong>
            <span>{buyer.phone}</span>
            <span>{buyer.address}</span>
            <span>Auth. {buyer.authorizationNo}</span>
          </section>
        </div>

        <footer className="inv-actions">
          <BackButton className="btn btn-secondary" />
          <a href={`/invoice/${token}/pdf`} className="btn btn-primary" download>
            <Download size={18} aria-hidden="true" /> Download PDF
          </a>
        </footer>

        <div className="inv-demo">Demo payment – no real money moved</div>
      </article>
    </main>
  );
}
