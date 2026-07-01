import { db } from "./db"
import { bookingTable, customerTable, serviceTable, therapistTable } from "./db/schema"
import { eq, desc } from "drizzle-orm"

export async function renderSpaDashboard(): Promise<string> {
  const allBookings = await db
    .select({
      id: bookingTable.id,
      date: bookingTable.date,
      timeSlot: bookingTable.timeSlot,
      status: bookingTable.status,
      customerName: customerTable.name,
      customerPhone: customerTable.phone,
      serviceName: serviceTable.name,
      therapistName: therapistTable.name,
      createdAt: bookingTable.createdAt,
    })
    .from(bookingTable)
    .leftJoin(customerTable, eq(bookingTable.customerId, customerTable.id))
    .leftJoin(serviceTable, eq(bookingTable.serviceId, serviceTable.id))
    .leftJoin(therapistTable, eq(bookingTable.therapistId, therapistTable.id))
    .orderBy(desc(bookingTable.createdAt))

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nova Spa - Admin Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-color: #0f172a;
      --card-bg: rgba(30, 41, 59, 0.7);
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #38bdf8;
      --secondary: #818cf8;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --border: rgba(255, 255, 255, 0.1);
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', sans-serif;
      background-color: var(--bg-color);
      background-image: 
        radial-gradient(at 0% 0%, rgba(56, 189, 248, 0.15) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(129, 140, 248, 0.15) 0px, transparent 50%);
      background-attachment: fixed;
      color: var(--text-main);
      min-height: 100vh;
      line-height: 1.5;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 3rem 1.5rem;
    }

    header {
      margin-bottom: 3rem;
      text-align: center;
    }

    h1 {
      font-size: 2.5rem;
      font-weight: 700;
      background: linear-gradient(to right, var(--primary), var(--secondary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 0.5rem;
    }

    p.subtitle {
      color: var(--text-muted);
      font-size: 1.1rem;
    }

    /* Glassmorphism Table Container */
    .table-container {
      background: var(--card-bg);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      border-radius: 1rem;
      padding: 1.5rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    th {
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      padding: 1rem;
      border-bottom: 1px solid var(--border);
      font-weight: 600;
    }

    td {
      padding: 1.25rem 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 0.95rem;
      vertical-align: middle;
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr {
      transition: background-color 0.2s ease;
    }

    tr:hover {
      background-color: rgba(255, 255, 255, 0.03);
    }

    /* Status Badges */
    .status {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .status.confirmed { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .status.pending { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
    .status.rescheduled { background: rgba(56, 189, 248, 0.2); color: #7dd3fc; border: 1px solid rgba(56, 189, 248, 0.3); }
    .status.cancelled { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    .status.waitlisted { background: rgba(167, 139, 250, 0.2); color: #c4b5fd; border: 1px solid rgba(167, 139, 250, 0.3); }

    .customer-info {
      display: flex;
      flex-direction: column;
    }
    .customer-name { font-weight: 500; color: #fff; }
    .customer-phone { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem; }

    .service-info {
      display: flex;
      flex-direction: column;
    }
    .service-name { font-weight: 500; color: #fff; }
    .therapist-name { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem; }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      color: var(--text-muted);
    }
    
    .empty-state svg {
      width: 4rem;
      height: 4rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Spa Dashboard</h1>
      <p class="subtitle">Real-time overview of all customer bookings and waitlists.</p>
    </header>

    <div class="table-container">
      ${allBookings.length === 0 ? `
        <div class="empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          <h3>No bookings yet</h3>
          <p>When customers book via WhatsApp, they will appear here.</p>
        </div>
      ` : `
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Service & Therapist</th>
              <th>Date & Time</th>
              <th>Status</th>
              <th>Booked On</th>
            </tr>
          </thead>
          <tbody>
            ${allBookings.map(b => `
              <tr>
                <td>
                  <div class="customer-info">
                    <span class="customer-name">${b.customerName || 'Unknown'}</span>
                    <span class="customer-phone">${b.customerPhone || 'N/A'}</span>
                  </div>
                </td>
                <td>
                  <div class="service-info">
                    <span class="service-name">${b.serviceName || 'Unknown'}</span>
                    <span class="therapist-name">${b.therapistName ? 'with ' + b.therapistName : 'No therapist assigned'}</span>
                  </div>
                </td>
                <td>
                  <div style="font-weight: 500; color: #fff;">${b.date ? new Date(b.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : 'N/A'}</div>
                  <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">${b.timeSlot || 'N/A'}</div>
                </td>
                <td>
                  <span class="status ${b.status?.toLowerCase() || 'pending'}">${b.status || 'pending'}</span>
                </td>
                <td style="color: var(--text-muted); font-size: 0.85rem;">
                  ${b.createdAt ? new Date(b.createdAt).toLocaleDateString() : 'N/A'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    </div>
  </div>
</body>
</html>
  `

  return html
}
