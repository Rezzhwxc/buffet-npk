function utf8ToBase64(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCharCode('0x' + p1);
    }));
}

async function checkEmployee() {
    const inputElement = document.getElementById("authInput");
    const employeeId = inputElement ? inputElement.value.trim() : "";

    if (!employeeId) {
        alert("Введите ID сотрудника");
        return;
    }

    const url = `http://localhost/InfoBase/hs/api/employees/check?id=${encodeURIComponent(employeeId)}`;
    const base64Credentials = utf8ToBase64("apiadmin:12345");

    try {
        let response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": "Basic " + base64Credentials,
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        let data = await response.json();

        if (data.exists === true) {
            closeModal();
        } else {
            alert("Сотрудник с таким ID не найден");
        }

    } catch (error) {
        alert("Ошибка соединения с сервером 1С");
    }
}

function closeModal() {
    const authOverlay = document.getElementById("authOverlay");
    if (authOverlay) {
        authOverlay.style.display = "none";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const authBtn = document.getElementById("authBtn");
    if (authBtn) {
        authBtn.addEventListener("click", checkEmployee);
    }
});