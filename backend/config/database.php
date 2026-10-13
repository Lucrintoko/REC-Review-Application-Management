<?php
/**
 * Database Connection Configuration (PostgreSQL via PDO)
 * Project: Research Ethics Review Application and Management System
 */

class Database {
    private $host = "127.0.0.1";
    private $port = "54322";
    private $db_name = "postgres";
    private $username = "postgres";
    private $password = "postgres";
    public $conn;

    public function getConnection() {
        $this->conn = null;

        $dsn = "pgsql:host=" . $this->host . ";port=" . $this->port . ";dbname=" . $this->db_name;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];

        try {
            $this->conn = new PDO($dsn, $this->username, $this->password, $options);
        } catch (PDOException $exception) {
            http_response_code(500);
            echo json_encode([
                "status" => "error",
                "message" => "Database connection error: " . $exception->getMessage()
            ]);
            exit;
        }

        return $this->conn;
    }
}
