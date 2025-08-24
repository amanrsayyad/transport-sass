"use client";

import React, { CSSProperties } from "react";
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

  return (
    <div id="invoice-pdf" style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerFlex}>
          <div>
            <h1 style={styles.companyName}>RDS TRANSPORT</h1>
            <p style={styles.smallText}>(Transport Contractor, Commission Agent)</p>
            <p style={styles.smallText}>Near Bombay Restaurant, Gorakhpur-Pirwadi, NH-4, Satara.</p>
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
          <p><strong>ADV.:</strong> _________</p>
          <p><strong>BAL.:</strong></p>
          <p><strong>TOTAL: ₹ {invoice.total}</strong></p>
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
            <p><strong>FOR RDS TRANSPORT</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
};