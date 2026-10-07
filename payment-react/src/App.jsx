import { useState } from "react";
import "./App.css";

function App() {
  const [receipt, setReceipt] = useState(null);
  const [date, setDate] = useState("2026-10-15");
  const [amount, setAmount] = useState("");

  const handleFileChange = (event) => {
    const file = event.target.files[0];

    if (file) {
      setReceipt(file);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!receipt) {
      alert("Please upload the official receipt.");
      return;
    }

    alert("Receipt submitted successfully!");
  };

  const handleCancel = () => {
    setReceipt(null);
    setAmount("");
  };

  return (
    <div className="page-container">
      <div className="receipt-card">
        <h2>Upload Official Receipt</h2>

        <form onSubmit={handleSubmit}>
          {/* Protocol */}
          <div className="protocol-row">
            <span className="protocol-label">Protocol No.</span>
            <span className="protocol-line"></span>
          </div>

          {/* Date + Amount */}
          <div className="details-row">
            <div className="field-group date-field">
              <div className="field-label">
                <span className="calendar-icon">▣</span>
                <span>Date Of Receipt:</span>
              </div>

              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="field-group amount-field">
              <div className="field-label">
                <span className="calculator-icon">▣</span>
                <span>Amount:</span>
              </div>

              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />

              <span className="amount-line"></span>
            </div>
          </div>

          {/* Instruction */}
          <div className="upload-note">
            Upload the official receipt in JPG or PNG format.
          </div>

          {/* Upload Area */}
          <div className="upload-box">
            {receipt ? (
              <div className="receipt-preview">
                <img
                  src={URL.createObjectURL(receipt)}
                  alt="Receipt preview"
                />

                <div className="file-name">
                  {receipt.name}
                </div>

                <label className="browse-button">
                  Change Receipt

                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    hidden
                  />
                </label>
              </div>
            ) : (
              <>
                <div className="upload-icon">↑</div>

                <div className="upload-title">
                  Attach the Official Receipt Here
                </div>

                <div className="upload-subtitle">
                  JPG or PNG - Maximum file size 5 MB
                </div>

                <label className="browse-button">
                  Browse File

                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    hidden
                  />
                </label>
              </>
            )}
          </div>

          {/* Buttons */}
          <div className="button-row">
            <button
              type="button"
              className="cancel-button"
              onClick={handleCancel}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="submit-button"
            >
              Submit Receipt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
