// =================================
// CALENDAR
// =================================

const receiptDate = document.getElementById("receiptDate");
const calendarButton = document.querySelector(".calendar-button");

calendarButton.addEventListener("click", function () {

    // Open the browser's date picker
    if (receiptDate.showPicker) {
        receiptDate.showPicker();
    } else {
        receiptDate.focus();
    }

});


// =================================
// FILE UPLOAD
// =================================

const receiptFile = document.getElementById("receiptFile");
const fileName = document.getElementById("fileName");

receiptFile.addEventListener("change", function () {

    if (this.files.length > 0) {
        fileName.textContent = this.files[0].name;
    } else {
        fileName.textContent = "";
    }

});


// =================================
// CLOSE POPUP
// =================================

function closeModal() {

    document.querySelector(".receipt-modal").style.display = "none";

}


// =================================
// SUBMIT RECEIPT
// =================================

function submitReceipt() {

    const file = receiptFile.files[0];
    const date = receiptDate.value;

    if (!date) {
        alert("Please select the receipt date.");
        return;
    }

    if (!file) {
        alert("Please upload the official receipt first.");
        return;
    }

    const allowedTypes = [
        "image/jpeg",
        "image/png"
    ];

    if (!allowedTypes.includes(file.type)) {
        alert("Please upload a JPG or PNG file.");
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        alert("File size must not exceed 5 MB.");
        return;
    }

    alert("Official receipt submitted successfully!");
}