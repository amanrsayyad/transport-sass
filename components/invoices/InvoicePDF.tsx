"use client";

import React, { CSSProperties } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/redux/store";
import { Invoice } from "@/lib/redux/slices/invoiceSlice";

interface InvoicePDFProps {
  invoice: Invoice;
}

export const InvoicePDF: React.FC<InvoicePDFProps> = ({ invoice }) => {
  // Use only inline styles with basic CSS properties to avoid color function issues
  const styles: { [key: string]: CSSProperties } = {
    container: {
      fontFamily: "Arial, sans-serif",
      backgroundColor: "#ffffff",
      padding: "32px",
      maxWidth: "1024px",
      margin: "0 auto",
    },
    header: {
      border: "2px solid #000000",
      padding: "16px",
      marginBottom: "16px",
    },
    headerFlex: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: "16px",
    },
    companyName: {
      fontSize: "20px",
      fontWeight: "bold",
      color: "#dc2626", // Simple hex color instead of text-red-600
    },
    smallText: {
      fontSize: "14px",
    },
    rightAlign: {
      textAlign: "right" as const,
    },
    divider: {
      borderTop: "1px solid #000000",
      paddingTop: "8px",
      marginBottom: "16px",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse" as const,
      border: "1px solid #000000",
      fontSize: "14px",
    },
    tableHeader: {
      backgroundColor: "#f3f4f6", // Simple hex color instead of bg-gray-100
    },
    tableCell: {
      border: "1px solid #000000",
      padding: "8px",
      textAlign: "left" as const,
    },
    marginTop: {
      marginTop: "16px",
    },
    marginTopLarge: {
      marginTop: "32px",
    },
    flexBetween: {
      display: "flex",
      justifyContent: "space-between",
    },
  };

  // Select current app user and customers from Redux store
  const currentAppUser = useSelector((state: RootState) => state.appUsers.currentAppUser);
  const appUsersList = useSelector((state: RootState) => state.appUsers.appUsers);
  const customers = useSelector((state: RootState) => state.customers.customers);

  // Determine effective App User for this invoice: prefer invoice.appUserId, else fall back
  const resolveId = (idLike: any): string | null => {
    if (!idLike) return null;
    if (typeof idLike === 'string') return idLike;
    if (typeof idLike === 'object' && idLike._id) return idLike._id as string;
    return null;
  };
  const invoiceUserId = resolveId((invoice as any).appUserId);
  const invoiceAppUser = invoiceUserId ? (appUsersList.find(u => u._id === invoiceUserId) ?? null) : null;
  const effectiveAppUser = invoiceAppUser ?? (currentAppUser ?? (appUsersList.find(u => u.status === "active") ?? appUsersList[0] ?? null));
  const displayCompanyOrUserName = effectiveAppUser?.name || "_________";

  // Find matching customer to show GSTIN and address (match against either customerName or companyName)
  const matchedCustomer = customers.find(
    (c) => c.customerName === invoice.customerName || c.companyName === invoice.customerName
  );

  return (
    <div id="invoice-pdf" style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerFlex}>
          <div>
            <h1 style={styles.companyName}>{displayCompanyOrUserName}</h1>
            <p style={styles.smallText}>(Transport Contractor, Commission Agent)</p>
            <p style={styles.smallText}><strong>GSTIN:</strong> {effectiveAppUser?.gstin || "_________"}</p>
            <p style={{...styles.smallText, whiteSpace: "pre-line"}}>
              <strong>Address:</strong>{" "}
              {effectiveAppUser?.address
                ? effectiveAppUser.address
                : "Near Bombay Restaurant, Gorakhpur-Pirwadi, NH-4, Satara."}
            </p>
            <p style={styles.smallText}>Email: rdsTransport5192@gmail.com</p>
            <p style={styles.smallText}>9604047861 / 9765000068</p>
          </div>
          <div style={{...styles.smallText, ...styles.rightAlign}}>
            <p><strong>Date:</strong> {new Date(invoice.date).toLocaleDateString()}</p>
            <p><strong>From:</strong> {invoice.from}</p>
            <p><strong>To:</strong> {invoice.to}</p>
            <p><strong>Taluka:</strong> {invoice.taluka || "_________"}</p>
            <p><strong>Dist.:</strong> {invoice.dist || "_________"}</p>
          </div>
        </div>

        <div style={styles.divider}>
          <p style={styles.smallText}><strong>Company Name:</strong> {invoice.customerName}</p>
          <p style={styles.smallText}><strong>Customer GSTIN:</strong> {matchedCustomer?.gstin || "_________"}</p>
          <p style={{...styles.smallText, whiteSpace: "pre-line"}}><strong>Customer Address:</strong> {matchedCustomer?.address || "_________"}</p>
          <p style={styles.smallText}><strong>Consignor:</strong> {invoice.consignor}</p>
          <p style={styles.smallText}><strong>Consignee:</strong> {invoice.consignee}</p>
          <p style={styles.smallText}><strong>L.R. No.:</strong> {invoice.lrNo} <strong>Co.D.O.No.:</strong> _________</p>
        </div>

        {/* Table */}
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.tableCell}>Product said to Contain</th>
              <th style={styles.tableCell}>Truck No.</th>
              <th style={styles.tableCell}>No. of Articles</th>
              <th style={styles.tableCell}>Weight/M.T.</th>
              <th style={styles.tableCell}>Rate/PMT</th>
              <th style={styles.tableCell}>₹</th>
              <th style={styles.tableCell}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {invoice.rows.map((row, index) => (
              <tr key={index}>
                <td style={styles.tableCell}>{row.product}</td>
                <td style={styles.tableCell}>{row.truckNo}</td>
                <td style={styles.tableCell}>{row.articles}</td>
                <td style={styles.tableCell}>{row.weight} Kg</td>
                <td style={styles.tableCell}>{row.rate}</td>
                <td style={styles.tableCell}>₹{row.total}</td>
                <td style={styles.tableCell}>{row.remarks}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{...styles.smallText, ...styles.marginTop}}>
          {(() => {
            const baseTotal = (invoice.rows || []).reduce((sum, row) => sum + (row.total || 0), 0);
            const percent = typeof invoice.taxPercent === 'number' ? invoice.taxPercent : 0;
            const taxAmount = typeof invoice.taxAmount === 'number' ? invoice.taxAmount : (percent > 0 ? (baseTotal * percent) / 100 : 0);
            const totalWithTax = typeof invoice.total === 'number' ? invoice.total : (baseTotal + taxAmount);
            const adv = typeof invoice.advanceAmount === 'number' ? invoice.advanceAmount : 0;
            const bal = typeof invoice.remainingAmount === 'number' ? invoice.remainingAmount : Math.max(0, totalWithTax - adv);
            return (
              <>
                <p><strong>Tax Percentage:</strong> {percent}%</p>
                <p><strong>Tax ({percent}%):</strong> ₹ {taxAmount}</p>
                <p><strong>ADV.:</strong> ₹ {adv}</p>
                <p><strong>BAL.:</strong> ₹ {bal}</p>
                <p><strong>TOTAL: ₹ {totalWithTax}</strong></p>
              </>
            );
          })()}
        </div>

        <div style={{...styles.smallText, ...styles.marginTopLarge, ...styles.flexBetween}}>
          <div>
            <p>Receiver's Signature ___________________</p>
            <br />
            <p>Driver's Signature ___________________</p>
            <br />
            <p>With Rubber Stamp</p>
            <br />
            <p>Received Goods in Good Condition</p>
          </div>
          <div style={styles.rightAlign}>
            <p>Subject to Satara Jurisdiction</p>
            <br />
            <br />
            <br />
            <p><strong>FOR {displayCompanyOrUserName.toUpperCase()}</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
};