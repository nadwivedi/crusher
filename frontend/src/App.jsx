import React, { useState } from "react";
import "./App.css";

const initialForm = {
  vehicleNo: "",
  weight: "",
};

const App = () => {
  const [form, setForm] = useState(initialForm);
  const [entries, setEntries] = useState([]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.vehicleNo.trim() || !form.weight.trim()) {
      return;
    }

    setEntries((current) => [
      {
        id: crypto.randomUUID(),
        vehicleNo: form.vehicleNo.trim().toUpperCase(),
        weight: form.weight.trim(),
      },
      ...current,
    ]);

    setForm(initialForm);
  };

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Crusher Tracker</p>
        <h1>Boulder Loading Register</h1>
        <p className="hero-copy">
          Record which vehicle number carried which weight.
        </p>
      </section>

      <section className="content-grid">
        <form className="entry-card" onSubmit={handleSubmit}>
          <div className="section-heading">
            <h2>Add Boulder Entry</h2>
            <p>Save the vehicle number with the transported weight.</p>
          </div>

          <label className="field">
            <span>Vehicle No</span>
            <input
              type="text"
              name="vehicleNo"
              value={form.vehicleNo}
              onChange={handleChange}
              placeholder="TN 01 AB 1234"
            />
          </label>

          <label className="field">
            <span>Weight</span>
            <input
              type="number"
              min="0"
              step="0.01"
              name="weight"
              value={form.weight}
              onChange={handleChange}
              placeholder="12.50"
            />
          </label>

          <button type="submit" className="submit-button">
            Add Entry
          </button>
        </form>

        <section className="list-card">
          <div className="section-heading">
            <h2>Vehicle Weight List</h2>
            <p>Quick view of which vehicle carried which weight.</p>
          </div>

          {entries.length === 0 ? (
            <div className="empty-state">
              No entries yet. Add a vehicle number and weight.
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Vehicle No</th>
                    <th>Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.vehicleNo}</td>
                      <td>{entry.weight} ton</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
};

export default App;
