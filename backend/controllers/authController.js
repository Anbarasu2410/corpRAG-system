const jwt = require("jsonwebtoken");

// Temporary users (replace with DB later)
const users = [
  { username: "admin", password: "1234" },
  { username: "employee", password: "abcd" },
];

exports.login = (req, res) => {
  const { username, password } = req.body;

  // find user
  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  // create token
  const token = jwt.sign(
    { username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.json({
    token,
    user: user.username,
  });
};