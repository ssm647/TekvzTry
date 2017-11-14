# Welcome

## Getting Started
1. Clone the repo
2. cd into the folder
3. `npm install`
4. Create a `.env` file in the folder as follows:
    ```
    # Email id & password for nodemailer
    email_id=youremailid@mailserver.com
    email_pass=your_password

    # Database credentials
    db_host=db_host_url
    db_user=db_user_name
    db_password=password
    db_database=tekviz
    ```
5. Set the MySQL with the given sql file
6. Create the key used to sign the JWT tokens as follows:
    - `openssl req -newkey rsa:2048 -nodes -keyout private_key.pem -x509 -days 365 -out certificate.pem`
    - Answer the questions asked accordingly
7. Finally `npm start`

