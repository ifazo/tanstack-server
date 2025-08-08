const errorHandler = (status, error, _req, res) => {
  console.error("❌ Server Error:", error);

  switch (status) {
    case 400:
      res.status(400).json({ message: "Bad Request" });
      break;
    case 401:
      res.status(401).json({ message: "Unauthorized" });
      break;
    case 403:
      res.status(403).json({ message: "Forbidden" });
      break;
    case 404:
      res.status(404).json({ message: "Not Found" });
      break;
    default:
      res.status(500).json({ message: "Internal Server Error" });
  }
};

export default errorHandler;