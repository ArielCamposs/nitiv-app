async function run() {
    try {
        const res = await fetch("http://localhost:3000/api/admin/create-student", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // Provide a dummy cookie or auth header if needed, but wait:
                // The API needs admin authentication! Let's provide a session cookie or header
            },
            body: JSON.stringify({
                email: "admin@colegio.cl", // We know this might be duplicate
                password: "secretpassword123",
                name: "Admin",
                last_name: "User"
            })
        });
        const data = await res.json();
        console.log("Status:", res.status);
        console.log("Data:", data);
    } catch (e) {
        console.error(e);
    }
}
run();
