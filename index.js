const express = require("express");
const path = require("path");
const db = require("./db");
const bcrypt = require("bcrypt");
const transporter = require("./email");
const app = express();
app.use (express.json());
app.use(express.urlencoded({extended: true}));

app.use(express.static("public"));
app.set("view engine","ejs");
//API Routes 
//SIGN UP ROUTE
app.get("/signUp",(req,res)=>{
    res.sendFile(__dirname + '/public/signup.html');
});
app.post("/signUp",async (req,res)=> {
    const{username,email,phoneNumber,password,confirmPassword} = req.body;

    if(password !== confirmPassword){

        return res.status(400).send("Passwords Do Not Match!");
    }

    try{

          // Hash the password
        const hashedPassword = await bcrypt.hash(password, 12);
        //Insert into Database
        const sql = `
                    INSERT INTO users
                    (username,email,phoneNumber,password)
                    values(?, ?, ?,?)
                    `;

        db.query(sql,[username, email, phoneNumber, hashedPassword],(err,result)=>{
            if (err) {
                    console.error("Error creating account:", err);
                    return res.status(500).send("Could not create account.");
                }

                console.log("User registered:", result.insertId);

                res.redirect("/Login.html");
        }
    );
    }catch (error) {
        console.error(error);
        res.status(500).send("Something went wrong.");
    }
});
// LOGIN ROUTE
app.post("/login", async (req, res) => {

    const { username, password } = req.body;

    const sql = `
        SELECT * FROM users
        WHERE username = ?
    `;

    db.query(sql, [username], async (err, results) => {

        if (err) {
            console.error("Login error:", err);
            return res.status(500).send("Server error.");
        }

        // User doesn't exist
        if (results.length === 0) {
            return res.status(401).send("Invalid username or password.");
        }

        const user = results[0];

        try {

            // Compare entered password with database password
            const passwordMatch = await bcrypt.compare(
                password,
                user.password
            );

            if (!passwordMatch) {
                return res.status(401).send("Invalid username or password.");
            }

            console.log("Login successful:", user.username);

            // Redirect after successful login
            res.redirect("/Appointments.html");

        } catch (error) {

            console.error("Password comparison error:", error);
            res.status(500).send("Something went wrong.");

        }
    });
});
app.get("/appointmentForm" , (req,res) => {
    res.sendFile (__dirname + '/public/GroomingwithMK.html');
});

app.post("/appointmentForm" ,async (req,res)=>{
    
    const {last_name,first_name,phone_number,email,location,pet_type,service,
          appointment_date,appointment_time}=req.body;

    const sql = `INSERT INTO appointments(last_name,first_name,phone_number,email,location,pet_type,service,appointment_date,appointment_time)
          
                VALUES(?, ?, ?, ?, ?, ?,?,?, ?)`;

    const values = [last_name,first_name,phone_number,email,location,pet_type,service,appointment_date,appointment_time];

    db.query(sql, values, async (err, result)=>{



        if (err) {
        console.error("Error inserting appointment:",err);

        return res.status(500).send("Failed to save Appointment");
        }
        console.log("Appointment successfully saved. ID:",result.insertId);

        //Send confirmation email to client
        try{
            await transporter.sendMail({
                from : "groomingwithmk@gmail.com",
                to : email,
                subject : "Grooming with MK - Appointment Confirmation",

                html : `
                       
                        <h2>Appointment Confirmation</h2>
                        <p>Hello ${first_name}${last_name},</p>
                        
                        <p>
                            Thank you for booking an appointment with
                            <strong>GroomingwithMK</strong>
                        </p>
                        
                        <h3>Appointment Details</h3>
                        <p><strong>Pet Type:</strong>${pet_type}</P>
                        <p><strong>Service:</strong>${service}</p>
                        <p><strong>Date:</strong>${appointment_date}</p>
                        <p><strong>Time:</strong>${appointment_time}</p>
                        <p><strong>Location:</strong>${location}</p>
                        
                        <br>
                        
                        <p>
                            
                            We have recieved your appointment request.
                            Incase of any changes we will contact you.
                        </p>
                        
                        <p>
                            Thank you,
                            <br>
                            <strong>GroomingwithMK</strong>
                        </p>
                        `
            });
            console.log("Confirmation email sent to:", email);
             res.send("Appointment booked successfully!");
        }catch(emailError){
            console.error("Error sending confirmation email:", emailError);

        // Appointment was saved even though email failed
        res.send(
            "Appointment booked successfully, but confirmation email could not be sent."
        );
        }

       
    });
});
app.post("/contactForm", async (req,res) => {
    console.log("Contact data recieved!");
    console.log(req.body);

    const {name,email,phone_number} = req.body;

    const sql =`INSERT INTO contacts
               (name, email,phone_number)values(?, ?, ?)`;

    const values = [name,email,phone_number];

    db.query(sql, values, (err,result)=> {
        if (err) {
            console.error("Contact database error: , err");

            return res.status(500).send("Failed to save contact!");
        }
        console.log("Contact saved Successfully!.ID:",
            result.insertId
        );

        res.send("Thank you! Your Contact information has been submitted.")
    });
    
});


// GET APPOINTMENTS API
app.get("/api/appointments", (req, res) => {

    const sql = `
        SELECT *
        FROM appointments
        ORDER BY appointment_id DESC
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.error("Error retrieving appointments:", err);

            return res.status(500).json({
                success: false,
                message: "Database error"
            });
        }

        console.log("Appointments:", results);

        res.status(200).json({
            success: true,
            appointments: results
        });
    });
});
app.delete("/api/appointments/:id", (req, res) => {

    const id = req.params.id;

    const sql = `
        DELETE FROM appointments
        WHERE appointment_id = ?
    `;

    db.query(sql, [id], (err, result) => {

        if (err) {
            console.error("Delete error:", err);

            return res.status(500).json({
                success: false,
                message: "Failed to delete appointment"
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Appointment not found"
            });
        }

        console.log("Appointment deleted. ID:", id);

        res.json({
            success: true,
            message: "Appointment deleted successfully"
        });

    });
});

//Get Appointment Booking history
app.get("/api/appointments/history", (req,res)=> {

    const period = req.query.period;

    let dateCondition = "";

    switch (period) {
        case "week":
            dateCondition = "INTERVAL 1 WEEK";
            break;
        
        case "month":
            dateCondition = "INTERVAL 1 MONTH";
            break;
        
        case "6months":
            dateCondition = "INTERVAL 6 MONTH";
            break;

        case "year":
            dateCondition = "INTERVAL 1 YEAR";
            break;

        default:
            return res.status(400).json({
                success: false,
                message: "Invalid period"
            });
    }

    const sql = `
    SELECT *
    FROM appointments
    WHERE appointment_date >= DATE_SUB(CURDATE(), ${dateCondition})
    ORDER BY appointment_date DESC
    `;

    db.query(sql, (err, result) => {
        if (err) {

            console.error("History:", err);

            return res.status(500).json({
                success: false,
                message: "Database error"
            });
        }

        res.json({
            success: true,
            appointments: result
        });
    });
});

//Get summarized reports
app.get("/api/appointments/report", (req,res)=> {
    const period = req.query.period;

    let dateCondition = "";

    switch (period) {

        case "week":
            dateCondition = "appointment_date >= CURDATE() - INTERVAL 7 DAY";
            break;

        case "month":
            dateCondition = "appointment_date >= CURDATE() - INTERVAL 1 MONTH";
            break;

        case "3months":
            dateCondition = "appointment_date >= CURDATE() - INTERVAL 3 MONTH";
            break;

        case "6months":
            dateCondition = "appointment_date >= CURDATE() - INTERVAL 6 MONTH";
            break;

        case "year":
            dateCondition = "appointment_date >= CURDATE() - INTERVAL 1 YEAR";
            break;

        default:
            return res.status(400).json({
                message: "Invalid report period"
            });
    }


    const sql = `
        SELECT
            appointment_date AS date,
            COUNT(*) AS totalAppointments,

            SUM(
                CASE
                    WHEN status = 'Completed'
                    THEN 1
                    ELSE 0
                END
            ) AS completed,

            SUM(
                CASE
                    WHEN status = 'Cancelled'
                    THEN 1
                    ELSE 0
                END
            ) AS cancelled,

            SUM(
                CASE
                    WHEN status = 'Pending'
                    THEN 1
                    ELSE 0
                END
            ) AS pending

        FROM appointments

        WHERE ${dateCondition}

        GROUP BY appointment_date

        ORDER BY appointment_date ASC
    `;


    db.query(sql, (error, results) => {

        if (error) {

            console.error("Report error:", error);

            return res.status(500).json({
                message: "Failed to generate report"
            });
        }

        res.json({
            appointments: results
        });

    });

});
app.put("/api/appointments/:id/status", (req, res) => {

    const id = req.params.id;
    const { status } = req.body;

    const sql = `
        UPDATE appointments
        SET status = ?
        WHERE appointment_id = ?
    `;

    db.query(sql, [status, id], (err, result) => {

        if (err) {

            console.error("Status update error:", err);

            return res.status(500).json({
                success: false,
                message: "Failed to update appointment status"
            });
        }

        if (result.affectedRows === 0) {

            return res.status(404).json({
                success: false,
                message: "Appointment not found"
            });
        }

        res.json({
            success: true,
            message: "Appointment status updated successfully"
        });

    });

});
app.listen(3000, () => {
    console.log("Server running on http://LocalHost:3000");
});