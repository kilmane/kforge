import { evaluateAppBuildQualityGate } from "./appBuildQualityGate";

function bookingWrite(content, originalGoal = "Build a booking app") {
  return evaluateAppBuildQualityGate({
    originalGoal,
    toolCall: {
      name: "write_file",
      args: { path: "src/App.jsx", content },
    },
  });
}

describe("app-build quality gate", () => {
  test("allows a credible booking workflow without forcing a calendar layout", () => {
    const content = `
      function BookingApp() {
        const [bookings, setBookings] = useState([]);
        return (
          <main>
            <section className="stats-grid">Live booking totals</section>
            <form className="booking-form">Booking intake fields</form>
            <section className="booking-list">
              {bookings.length === 0 ? "No bookings yet" : "Booking cards"}
            </section>
            <button onClick={() => setBookings([])}>Reset bookings</button>
          </main>
        );
      }
    `;

    expect(bookingWrite(content)).toEqual({ ok: true });
  });

  test("blocks unrequested named demo booking records", () => {
    const content = `
      const initialBookings = [
        { id: 1, clientName: "Alice Brown", status: "confirmed" },
        { id: 2, clientName: "Daniel Green", status: "pending" },
      ];
    `;

    expect(bookingWrite(content)).toMatchObject({
      ok: false,
      reason: expect.stringContaining("unrequested named demo records"),
    });
  });

  test("blocks reset handlers that restore seeded booking records", () => {
    const content = `
      const seedBookings = [
        { id: 1, clientName: "Example", date: "2026-07-20" },
      ];
      function handleReset() {
        setBookings(seedBookings);
      }
    `;

    expect(
      bookingWrite(content, "Build a booking app with sample data"),
    ).toMatchObject({
      ok: false,
      reason: expect.stringContaining("restore seeded or starter records"),
    });
  });
});
