import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { MongoClient, ObjectId } from "mongodb";
import Stripe from "stripe";
import { OAuth2Client } from "google-auth-library";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID
);


const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  ...(process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(",").map((url) => url.trim())
    : []),
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);


app.use(express.json());

const client = new MongoClient(
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017"
);

await client.connect();

const db = client.db(process.env.DB_NAME || "resell_hub");

const users = db.collection("users");
const products = db.collection("products");
const orders = db.collection("orders");
const payments = db.collection("payments");
const wishlists = db.collection("wishlists");
const reviews = db.collection("reviews");

/* =========================================================
   HELPERS
   ========================================================= */

const tokenFor = (user) =>
  jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET || "dev-secret-change-me",
    { expiresIn: "7d" }
  );

const auth =
  (roles = []) =>
  (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];

      if (!token) {
        return res.status(401).json({
          message: "Unauthorized",
        });
      }

      req.auth = jwt.verify(
        token,
        process.env.JWT_SECRET || "dev-secret-change-me"
      );

      if (
        roles.length &&
        !roles.includes(req.auth.role)
      ) {
        return res.status(403).json({
          message: "Forbidden",
        });
      }

      next();
    } catch {
      return res.status(401).json({
        message: "Invalid or expired token",
      });
    }
  };

const safeObjectId = (id) => {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
};

const orderAmount = (order) => {
  if (Number.isFinite(Number(order.totalAmount))) {
    return Number(order.totalAmount);
  }

  if (Number.isFinite(Number(order.total))) {
    return Number(order.total);
  }

  if (Number.isFinite(Number(order.amount))) {
    return Number(order.amount);
  }

  if (Number.isFinite(Number(order.price))) {
    return Number(order.price) * Number(order.quantity || 1);
  }

  return 0;
};

/* =========================================================
   HEALTH
   ========================================================= */

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});


/* =========================================================
   PUBLIC TRUSTED SELLERS
   ========================================================= */

app.get("/api/marketplace/trusted-sellers", async (req, res) => {
  try {
    const sellers = await users
      .find(
        {
          role: "seller",
          status: { $ne: "blocked" },
        },
        {
          projection: {
            _id: 1,
            name: 1,
            photo: 1,
            location: 1,
            rating: 1,
            verified: 1,
          },
        }
      )
      .sort({
        rating: -1,
        createdAt: -1,
      })
      .limit(4)
      .toArray();

    const trustedSellers = sellers.map((seller) => ({
      _id: seller._id,
      name: seller.name || "ReSell Seller",
      photo: seller.photo || "",
      location: seller.location || "Location not provided",
      rating: Number(seller.rating || 0),
      verified: Boolean(seller.verified),
    }));

    res.json(trustedSellers);
  } catch (error) {
    console.error("PUBLIC TRUSTED SELLERS ERROR:", error);

    res.status(500).json({
      message: "Could not load trusted sellers.",
    });
  }
});


/* =========================================================
   PUBLIC POPULAR CATEGORIES
   ========================================================= */

app.get("/api/marketplace/categories", async (req, res) => {
  try {
    const categories = await products.aggregate([
      {
        $match: {
          moderationStatus: { $in: ["approved", null] },
          category: { $type: "string", $ne: "" },
        },
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          count: -1,
          _id: 1,
        },
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          count: 1,
        },
      },
    ]).toArray();

    res.json(categories);
  } catch (error) {
    console.error("PUBLIC CATEGORIES ERROR:", error);

    res.status(500).json({
      message: "Could not load marketplace categories.",
    });
  }
});


/* =========================================================
   PUBLIC MARKETPLACE STATISTICS
   ========================================================= */

app.get("/api/marketplace/stats", async (req, res) => {
  try {
    const [
      totalProducts,
      activeSellers,
      activeBuyers,
      totalOrders,
    ] = await Promise.all([
      // Count products that are visible on the public marketplace
      products.countDocuments({
        moderationStatus: {
          $in: ["approved", null],
        },
      }),

      // Count seller accounts that are not blocked
      users.countDocuments({
        role: "seller",
        status: { $ne: "blocked" },
      }),

      // Count buyer accounts that are not blocked
      users.countDocuments({
        role: "buyer",
        status: { $ne: "blocked" },
      }),

      // Count all marketplace orders
      orders.countDocuments({}),
    ]);

    res.json({
      products: totalProducts,
      sellers: activeSellers,
      buyers: activeBuyers,
      orders: totalOrders,
    });
  } catch (error) {
    console.error(
      "PUBLIC MARKETPLACE STATS ERROR:",
      error
    );

    res.status(500).json({
      message: "Could not load marketplace statistics.",
    });
  }
});


/* =========================================================
   PUBLIC SUCCESS STORIES
   ========================================================= */

app.get("/api/marketplace/success-stories", async (req, res) => {
  try {
    const reviewList = await reviews
      .find({
        rating: { $gte: 1, $lte: 5 },
        comment: { $type: "string", $ne: "" },
      })
      .sort({ createdAt: -1, _id: -1 })
      .limit(6)
      .toArray();

    const productIds = reviewList
      .map((review) => safeObjectId(review.productId))
      .filter(Boolean);

    const relatedProducts = await products
      .find({
        _id: { $in: productIds },
      })
      .project({
        title: 1,
        moderationStatus: 1,
      })
      .toArray();

    const productMap = new Map(
      relatedProducts.map((product) => [
        product._id.toString(),
        product,
      ])
    );

    const stories = reviewList
      .map((review) => {
        const product = productMap.get(
          String(review.productId)
        );

        if (
          !product ||
          (product.moderationStatus &&
            product.moderationStatus !== "approved")
        ) {
          return null;
        }

        return {
          _id: review._id,
          reviewerName: review.reviewerName || "Marketplace Buyer",
          role: "Buyer",
          rating: Number(review.rating),
          comment: review.comment.trim(),
          productId: String(review.productId),
          productTitle: product.title || "Product",
          createdAt: review.createdAt,
        };
      })
      .filter(Boolean)
      .slice(0, 3);

    res.json(stories);
  } catch (error) {
    console.error("PUBLIC SUCCESS STORIES ERROR:", error);

    res.status(500).json({
      message: "Could not load success stories.",
    });
  }
});


/* =========================================================
   AUTH
   ========================================================= */

app.post("/api/auth/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = "buyer",
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const existingUser = await users.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    const doc = {
      name: name.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 10),

      role: ["buyer", "seller"].includes(role)
        ? role
        : "buyer",

      photo: "",
      location: "",
      status: "active",
      createdAt: new Date(),
    };

    const result = await users.insertOne(doc);

    doc._id = result.insertedId;

    const { password: _, ...safe } = doc;

    res.status(201).json({
      token: tokenFor(doc),
      user: safe,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(
      req.body.email || ""
    )
      .trim()
      .toLowerCase();

    const password = String(
      req.body.password || ""
    );

    const user = await users.findOne({ email });

    if (
      !user ||
      !(await bcrypt.compare(
        password,
        user.password
      ))
    ) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (user.status === "blocked") {
      return res.status(403).json({
        message:
          "This account has been blocked by the administrator.",
      });
    }

    const { password: _, ...safe } = user;

    res.json({
      token: tokenFor(user),
      user: safe,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

app.get(
  "/api/auth/me",
  auth(),
  async (req, res) => {
    const id = safeObjectId(req.auth.id);

    if (!id) {
      return res.status(400).json({
        message: "Invalid user id",
      });
    }

    const user = await users.findOne(
      { _id: id },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json(user);
  }
);

/* =========================================================
   GOOGLE LOGIN
   ========================================================= */

app.post("/api/auth/google", async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential || !process.env.GOOGLE_CLIENT_ID) {
      return res.status(400).json({
        message: "Google credential or configuration is missing.",
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload?.email || !payload.email_verified) {
      return res.status(401).json({
        message: "Google email is not verified.",
      });
    }

    const email = payload.email.trim().toLowerCase();

    let user = await users.findOne({ email });

    if (user?.status === "blocked") {
      return res.status(403).json({
        message: "This account has been blocked.",
      });
    }

    if (!user) {
      const newUser = {
        name: payload.name || email.split("@")[0],
        email,
        googleId: payload.sub,
        role: "buyer",
        photo: payload.picture || "",
        location: "",
        status: "active",
        createdAt: new Date(),
      };

      const result = await users.insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };
    } else if (!user.googleId) {
      // Do not automatically link an existing password account.
      return res.status(409).json({
        message:
          "An account with this email already exists. Sign in using your existing method.",
      });
    } else if (user.googleId !== payload.sub) {
      return res.status(403).json({
        message: "Google account does not match.",
      });
    }

    const { password: _, ...safeUser } = user;

    res.json({
      token: tokenFor(user),
      user: safeUser,
    });
  } catch (error) {
    console.error("GOOGLE LOGIN ERROR:", error.message);

    res.status(401).json({
      message: "Google authentication failed.",
    });
  }
});

/* =========================================================
   PUBLIC PRODUCT REVIEWS
   ========================================================= */

app.get("/api/products/:id/reviews", async (req, res) => {
  try {
    const productId = safeObjectId(req.params.id);

    if (!productId) {
      return res.status(400).json({
        message: "Invalid product ID.",
      });
    }

    const product = await products.findOne({
      _id: productId,
      moderationStatus: {
        $in: ["approved", null],
      },
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found.",
      });
    }

    const reviewList = await reviews
      .find({
        productId: productId.toString(),
        rating: { $gte: 1, $lte: 5 },
      })
      .sort({ createdAt: -1, _id: -1 })
      .toArray();

    const formattedReviews = reviewList.map((review) => ({
      _id: review._id,
      reviewerName:
        review.reviewerName || "Marketplace Buyer",
      rating: Number(review.rating),
      comment: review.comment || "",
      createdAt: review.createdAt,
    }));

    const totalReviews = formattedReviews.length;

    const averageRating = totalReviews
      ? Number(
          (
            formattedReviews.reduce(
              (sum, review) => sum + review.rating,
              0
            ) / totalReviews
          ).toFixed(1)
        )
      : 0;

    res.json({
      productId: productId.toString(),
      averageRating,
      totalReviews,
      reviews: formattedReviews,
    });
  } catch (error) {
    console.error("PRODUCT REVIEWS ERROR:", error);

    res.status(500).json({
      message: "Could not load product reviews.",
    });
  }
});

/* =========================================================
   PUBLIC PRODUCTS
   ========================================================= */

app.get("/api/products", async (req, res) => {
  try {
    const page = Math.max(
      1,
      Number(req.query.page) || 1
    );

    const limit = Math.min(
      50,
      Number(req.query.limit) || 12
    );

    const query = {
      moderationStatus: {
        $in: ["approved", null],
      },
    };

    if (req.query.search) {
      const rx = new RegExp(
        req.query.search,
        "i"
      );

      query.$or = [
        { title: rx },
        { category: rx },
      ];
    }

    if (req.query.category) {
      query.category = req.query.category;
    }

    
let sort = { createdAt: -1, _id: -1 };

if (req.query.sort === "price-asc") {
  sort = { price: 1, _id: 1 };
}

if (req.query.sort === "price-desc") {
  sort = { price: -1, _id: -1 };
}


    const total =
      await products.countDocuments(query);

    const list = await products
      .find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    res.json({
      products: list,
      page,
      pages: Math.max(
        1,
        Math.ceil(total / limit)
      ),
      total,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const id = safeObjectId(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: "Invalid product id",
      });
    }

    const product = await products.findOne({
      _id: id,
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

/* =========================================================
   SELLER PRODUCTS
   ========================================================= */
// Get all products belonging to the logged-in seller
app.get(
  "/api/seller/products",
  auth(["seller"]),
  async (req, res) => {
    try {
      const sellerProducts = await products
        .find({
          $or: [
            { sellerId: req.auth.id },
            { "sellerInfo.userId": req.auth.id },
          ],
        })
        .sort({ createdAt: -1, _id: -1 })
        .toArray();

      res.json({ products: sellerProducts });
    } catch (error) {
      console.error("SELLER PRODUCTS ERROR:", error);

      res.status(500).json({
        message: "Could not load seller products.",
      });
    }
  }
);

app.post(
  "/api/products",
  auth(["seller", "admin"]),
  async (req, res) => {
    try {
      const doc = {
        ...req.body,

        price: Number(req.body.price),
        stock: Number(req.body.stock || 1),

        sellerId: req.auth.id,

        sellerInfo: {
          ...req.body.sellerInfo,
          userId: req.auth.id,
        },

        status: "available",

        moderationStatus:
          req.auth.role === "admin"
            ? "approved"
            : "pending",

        createdAt: new Date(),
      };

      const result =
        await products.insertOne(doc);

      res.status(201).json({
        ...doc,
        _id: result.insertedId,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);


app.patch(
  "/api/products/:id",
  auth(["seller", "admin"]),
  async (req, res) => {
    try {
      const id = safeObjectId(req.params.id);

      if (!id) {
        return res.status(400).json({
          message: "Invalid product ID.",
        });
      }

      const query = { _id: id };

      if (req.auth.role === "seller") {
        query.sellerId = req.auth.id;
      }

      const allowedFields = [
        "title",
        "category",
        "condition",
        "description",
        "price",
        "stock",
        "images",
      ];

      const changes = {};

      for (const field of allowedFields) {
        if (Object.prototype.hasOwnProperty.call(req.body, field)) {
          changes[field] = req.body[field];
        }
      }

      if ("title" in changes) {
        if (
          typeof changes.title !== "string" ||
          !changes.title.trim()
        ) {
          return res.status(400).json({
            message: "Product title is required.",
          });
        }
        changes.title = changes.title.trim();
      }

      for (const field of ["category", "condition", "description"]) {
        if (field in changes) {
          if (typeof changes[field] !== "string") {
            return res.status(400).json({
              message: `Invalid ${field}.`,
            });
          }
          changes[field] = changes[field].trim();
        }
      }

      if ("price" in changes) {
        const price = Number(changes.price);

        if (!Number.isFinite(price) || price <= 0) {
          return res.status(400).json({
            message: "Price must be greater than zero.",
          });
        }

        changes.price = price;
      }

      if ("stock" in changes) {
        const stock = Number(changes.stock);

        if (!Number.isInteger(stock) || stock < 0) {
          return res.status(400).json({
            message: "Stock must be a non-negative whole number.",
          });
        }

        changes.stock = stock;
      }

      if ("images" in changes) {
        if (
          !Array.isArray(changes.images) ||
          !changes.images.every(
            (image) => typeof image === "string"
          )
        ) {
          return res.status(400).json({
            message: "Images must be an array of URLs.",
          });
        }
      }

      if (!Object.keys(changes).length) {
        return res.status(400).json({
          message: "No valid changes provided.",
        });
      }

      changes.updatedAt = new Date();

      if (req.auth.role === "seller") {
        changes.moderationStatus = "pending";
      }

      const result = await products.updateOne(
        query,
        { $set: changes }
      );

      if (!result.matchedCount) {
        return res.status(404).json({
          message: "Product not found or access denied.",
        });
      }

      res.json({
        success: true,
        message:
          req.auth.role === "seller"
            ? "Product updated and submitted for admin approval."
            : "Product updated successfully.",
      });
    } catch (error) {
      console.error("UPDATE PRODUCT ERROR:", error);

      res.status(500).json({
        message: "Could not update product.",
      });
    }
  }
);


app.delete(
  "/api/products/:id",
  auth(["seller", "admin"]),
  async (req, res) => {
    try {
      const id = safeObjectId(req.params.id);

      if (!id) {
        return res.status(400).json({
          message: "Invalid product id",
        });
      }

      const query = { _id: id };

      if (req.auth.role === "seller") {
        query.sellerId = req.auth.id;
      }

      const result =
        await products.deleteOne(query);

      res.json({
        deleted: result.deletedCount,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

/* =========================================================
   ORDERS
   ========================================================= */

app.get(
  "/api/orders",
  auth(),
  async (req, res) => {
    try {
      let query = {};

      if (req.auth.role === "buyer") {
        query = {
          "buyerInfo.userId": req.auth.id,
        };
      }

      if (req.auth.role === "seller") {
        query = {
          "sellerInfo.userId": req.auth.id,
        };
      }

      const list = await orders
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();

      res.json(list);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

app.post(
  "/api/orders",
  auth(["buyer"]),
  async (req, res) => {
    try {
      const doc = {
        ...req.body,

        buyerInfo: {
          ...req.body.buyerInfo,
          userId: req.auth.id,
        },

        paymentStatus: "pending",
        orderStatus: "pending",
        createdAt: new Date(),
      };

      const result =
        await orders.insertOne(doc);

      res.status(201).json({
        ...doc,
        _id: result.insertedId,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

app.patch(
  "/api/orders/:id/status",
  auth(["seller", "admin"]),
  async (req, res) => {
    try {
      const allowed = [
        "pending",
        "accepted",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ];

      const status = String(
        req.body.status || ""
      ).toLowerCase();

      if (!allowed.includes(status)) {
        return res.status(400).json({
          message: "Invalid status",
        });
      }

      const id = safeObjectId(req.params.id);

      if (!id) {
        return res.status(400).json({
          message: "Invalid order id",
        });
      }

      const query = { _id: id };

      if (req.auth.role === "seller") {
        query["sellerInfo.userId"] =
          req.auth.id;
      }

      const result = await orders.updateOne(
        query,
        {
          $set: {
            orderStatus: status,
            updatedAt: new Date(),
          },
        }
      );

      if (!result.matchedCount) {
        return res.status(404).json({
          message: "Order not found",
        });
      }

      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

/* =========================================================
   ADMIN - USERS
   ========================================================= */

app.get(
  "/api/admin/users",
  auth(["admin"]),
  async (req, res) => {
    try {
      const list = await users
        .find(
          {},
          {
            projection: {
              password: 0,
            },
          }
        )
        .sort({ createdAt: -1 })
        .toArray();

      res.json(list);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

app.patch(
  "/api/admin/users/:id/status",
  auth(["admin"]),
  async (req, res) => {
    try {
      const id = safeObjectId(req.params.id);

      if (!id) {
        return res.status(400).json({
          message: "Invalid user id",
        });
      }

      if (
        id.toString() === req.auth.id
      ) {
        return res.status(400).json({
          message:
            "You cannot block your own admin account.",
        });
      }

      const allowed = [
        "active",
        "blocked",
      ];

      if (
        !allowed.includes(req.body.status)
      ) {
        return res.status(400).json({
          message: "Invalid user status",
        });
      }

      await users.updateOne(
        { _id: id },
        {
          $set: {
            status: req.body.status,
            updatedAt: new Date(),
          },
        }
      );

      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

/* =========================================================
   ADMIN - PRODUCTS
   ========================================================= */

app.get(
  "/api/admin/products",
  auth(["admin"]),
  async (req, res) => {
    try {
      const list = await products
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

      res.json(list);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

app.patch(
  "/api/admin/products/:id/moderation",
  auth(["admin"]),
  async (req, res) => {
    try {
      const allowed = [
        "pending",
        "approved",
        "rejected",
      ];

      const moderationStatus = String(
        req.body.status || ""
      ).toLowerCase();

      if (
        !allowed.includes(
          moderationStatus
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid moderation status",
        });
      }

      const id = safeObjectId(req.params.id);

      if (!id) {
        return res.status(400).json({
          message: "Invalid product id",
        });
      }

      const result =
        await products.updateOne(
          { _id: id },
          {
            $set: {
              moderationStatus,
              updatedAt: new Date(),
            },
          }
        );

      if (!result.matchedCount) {
        return res.status(404).json({
          message: "Product not found",
        });
      }

      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

/* =========================================================
   ADMIN - ANALYTICS
   ========================================================= */

app.get(
  "/api/admin/analytics",
  auth(["admin"]),
  async (req, res) => {
    try {
      const [
        allUsers,
        allProducts,
        allOrders,
      ] = await Promise.all([
        users
          .find(
            {},
            {
              projection: {
                password: 0,
              },
            }
          )
          .toArray(),

        products.find({}).toArray(),

        orders.find({}).toArray(),
      ]);

      const sellers = allUsers.filter(
        (u) => u.role === "seller"
      );

      const buyers = allUsers.filter(
        (u) => u.role === "buyer"
      );

      const activeUsers = allUsers.filter(
        (u) => u.status !== "blocked"
      );

      const deliveredOrders =
        allOrders.filter(
          (o) =>
            String(
              o.orderStatus
            ).toLowerCase() ===
            "delivered"
        );

      const paidOrders =
        deliveredOrders.filter(
          (o) =>
            !o.paymentStatus ||
            ["paid", "completed"].includes(
              String(
                o.paymentStatus
              ).toLowerCase()
            )
        );

      const totalRevenue =
        paidOrders.reduce(
          (sum, order) =>
            sum + orderAmount(order),
          0
        );

      const now = new Date();

      const months = [];

      for (let i = 5; i >= 0; i--) {
        const date = new Date(
          now.getFullYear(),
          now.getMonth() - i,
          1
        );

        months.push({
          key: `${date.getFullYear()}-${date.getMonth()}`,
          month: date.toLocaleString(
            "en-US",
            {
              month: "short",
            }
          ),
          revenue: 0,
          users: 0,
          orders: 0,
        });
      }

      for (const order of paidOrders) {
        const date = new Date(
          order.createdAt
        );

        if (
          Number.isNaN(date.getTime())
        ) {
          continue;
        }

        const key = `${date.getFullYear()}-${date.getMonth()}`;

        const month = months.find(
          (m) => m.key === key
        );

        if (month) {
          month.revenue +=
            orderAmount(order);
        }
      }

      for (const order of allOrders) {
        const date = new Date(
          order.createdAt
        );

        if (
          Number.isNaN(date.getTime())
        ) {
          continue;
        }

        const key = `${date.getFullYear()}-${date.getMonth()}`;

        const month = months.find(
          (m) => m.key === key
        );

        if (month) {
          month.orders += 1;
        }
      }

      for (const user of allUsers) {
        const date = new Date(
          user.createdAt
        );

        if (
          Number.isNaN(date.getTime())
        ) {
          continue;
        }

        const key = `${date.getFullYear()}-${date.getMonth()}`;

        const month = months.find(
          (m) => m.key === key
        );

        if (month) {
          month.users += 1;
        }
      }

      let runningUsers = 0;

      const userGrowth = months.map(
        (month) => {
          runningUsers += month.users;

          return {
            month: month.month,
            users: runningUsers,
          };
        }
      );

      const categoryMap = {};

      for (const product of allProducts) {
        const category =
          product.category || "Other";

        categoryMap[category] =
          (categoryMap[category] || 0) +
          1;
      }

      const categoryPerformance =
        Object.entries(categoryMap)
          .map(([category, count]) => ({
            category,
            count,
          }))
          .sort(
            (a, b) =>
              b.count - a.count
          );

      const orderStatus = {};

      for (const order of allOrders) {
        const status = String(
          order.orderStatus || "pending"
        ).toLowerCase();

        orderStatus[status] =
          (orderStatus[status] || 0) +
          1;
      }

      res.json({
        summary: {
          totalUsers: allUsers.length,
          totalProducts:
            allProducts.length,
          totalOrders: allOrders.length,
          totalRevenue,
          sellers: sellers.length,
          buyers: buyers.length,
          activeUsers:
            activeUsers.length,

          pendingProducts:
            allProducts.filter(
              (p) =>
                (p.moderationStatus ||
                  "approved") ===
                "pending"
            ).length,

          deliveredOrders:
            deliveredOrders.length,
        },

        revenueOverview: months.map(
          (m) => ({
            month: m.month,
            revenue: m.revenue,
          })
        ),

        userGrowth,

        monthlyOrders: months.map(
          (m) => ({
            month: m.month,
            orders: m.orders,
          })
        ),

        categoryPerformance,

        orderStatus,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);


/* =========================================================
   WISHLIST
   ========================================================= */

// Get logged-in buyer's wishlist
app.get(
  "/api/wishlist",
  auth(["buyer"]),
  async (req, res) => {
    try {
      const items = await wishlists
        .find({
          buyerId: req.auth.id,
        })
        .sort({
          createdAt: -1,
        })
        .toArray();

      const productIds = items
        .map((item) => safeObjectId(item.productId))
        .filter(Boolean);

      if (!productIds.length) {
        return res.json([]);
      }

      const wishlistProducts = await products
        .find({
          _id: {
            $in: productIds,
          },
        })
        .toArray();

      const productMap = new Map(
        wishlistProducts.map((product) => [
          product._id.toString(),
          product,
        ])
      );

      const result = items
        .map((item) => {
          const product = productMap.get(
            String(item.productId)
          );

          if (!product) {
            return null;
          }

          return {
            wishlistId: item._id,
            addedAt: item.createdAt,
            ...product,
          };
        })
        .filter(Boolean);

      res.json(result);
    } catch (error) {
      console.error("GET WISHLIST ERROR:", error);

      res.status(500).json({
        message: "Could not load wishlist.",
      });
    }
  }
);


// Check whether one product is in wishlist
app.get(
  "/api/wishlist/:productId/check",
  auth(["buyer"]),
  async (req, res) => {
    try {
      const productObjectId = safeObjectId(
        req.params.productId
      );

      if (!productObjectId) {
        return res.status(400).json({
          message: "Invalid product ID.",
        });
      }

      const item = await wishlists.findOne({
        buyerId: req.auth.id,
        productId: req.params.productId,
      });

      res.json({
        inWishlist: Boolean(item),
      });
    } catch (error) {
      console.error("CHECK WISHLIST ERROR:", error);

      res.status(500).json({
        message: "Could not check wishlist.",
      });
    }
  }
);


// Add product to wishlist
app.post(
  "/api/wishlist/:productId",
  auth(["buyer"]),
  async (req, res) => {
    try {
      const productObjectId = safeObjectId(
        req.params.productId
      );

      if (!productObjectId) {
        return res.status(400).json({
          message: "Invalid product ID.",
        });
      }

      const product = await products.findOne({
        _id: productObjectId,
      });

      if (!product) {
        return res.status(404).json({
          message: "Product not found.",
        });
      }

      const existing = await wishlists.findOne({
        buyerId: req.auth.id,
        productId: req.params.productId,
      });

      if (existing) {
        return res.json({
          message: "Product is already in your wishlist.",
          inWishlist: true,
        });
      }

      const doc = {
        buyerId: req.auth.id,
        productId: req.params.productId,
        createdAt: new Date(),
      };

      const result = await wishlists.insertOne(doc);

      res.status(201).json({
        message: "Product added to wishlist.",
        inWishlist: true,
        wishlistId: result.insertedId,
      });
    } catch (error) {
      console.error("ADD WISHLIST ERROR:", error);

      res.status(500).json({
        message: "Could not add product to wishlist.",
      });
    }
  }
);


// Remove product from wishlist
app.delete(
  "/api/wishlist/:productId",
  auth(["buyer"]),
  async (req, res) => {
    try {
      const result = await wishlists.deleteOne({
        buyerId: req.auth.id,
        productId: req.params.productId,
      });

      res.json({
        message:
          result.deletedCount > 0
            ? "Product removed from wishlist."
            : "Product was not in your wishlist.",
        inWishlist: false,
      });
    } catch (error) {
      console.error("REMOVE WISHLIST ERROR:", error);

      res.status(500).json({
        message: "Could not remove product from wishlist.",
      });
    }
  }
);


/* =========================================================
   PAYMENTS - STRIPE / USD
   ========================================================= */

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY);
};


/* ---------------------------------------------------------
   CREATE STRIPE PAYMENT INTENT
   Server calculates price from MongoDB.
   Never trust an amount supplied by the browser.
   --------------------------------------------------------- */

app.post(
  "/api/payments/create-intent",
  auth(["buyer"]),
  async (req, res) => {
    try {
      const stripe = getStripe();

      if (!stripe) {
        return res.status(503).json({
          message:
            "Stripe is not configured. Add STRIPE_SECRET_KEY to server/.env.",
        });
      }

      const { productId, quantity = 1 } = req.body;

      const productObjectId = safeObjectId(productId);

      if (!productObjectId) {
        return res.status(400).json({
          message: "Invalid product ID.",
        });
      }

      const product = await products.findOne({
        _id: productObjectId,
      });

      if (!product) {
        return res.status(404).json({
          message: "Product not found.",
        });
      }

      if (
        product.moderationStatus &&
        product.moderationStatus !== "approved"
      ) {
        return res.status(400).json({
          message:
            "This product is not currently available for purchase.",
        });
      }

      if (
        product.status &&
        String(product.status).toLowerCase() !==
          "available"
      ) {
        return res.status(400).json({
          message: "This product is not available.",
        });
      }

      const requestedQuantity = Math.max(
        1,
        Number.parseInt(quantity, 10) || 1
      );

      const availableStock = Number(
        product.stock ?? 1
      );

      if (
        Number.isFinite(availableStock) &&
        requestedQuantity > availableStock
      ) {
        return res.status(400).json({
          message: `Only ${availableStock} item(s) available.`,
        });
      }

      const unitPrice = Number(product.price);

      if (
        !Number.isFinite(unitPrice) ||
        unitPrice <= 0
      ) {
        return res.status(400).json({
          message: "Invalid product price.",
        });
      }

      const totalAmount =
        unitPrice * requestedQuantity;

      const paymentIntent =
        await stripe.paymentIntents.create({
          amount: Math.round(totalAmount * 100),

          currency: "usd",

          automatic_payment_methods: {
            enabled: true,
          },

          metadata: {
            buyerId: req.auth.id,
            productId: product._id.toString(),
            quantity:
              requestedQuantity.toString(),
          },
        });

      res.json({
        clientSecret:
          paymentIntent.client_secret,

        paymentIntentId:
          paymentIntent.id,

        amount: totalAmount,

        currency: "usd",

        product: {
          _id: product._id,
          title: product.title,
          price: unitPrice,
          image:
            product.images?.[0] || "",
        },
      });
    } catch (error) {
      console.error(
        "CREATE PAYMENT INTENT ERROR:",
        error
      );

      res.status(500).json({
        message:
          error.message ||
          "Could not start payment.",
      });
    }
  }
);


/* ---------------------------------------------------------
   COMPLETE PAYMENT

   Called AFTER Stripe confirms the card payment.

   The server retrieves the PaymentIntent directly from Stripe
   before creating the paid order.
   --------------------------------------------------------- */

app.post(
  "/api/payments/complete",
  auth(["buyer"]),
  async (req, res) => {
    try {
      const stripe = getStripe();

      if (!stripe) {
        return res.status(503).json({
          message:
            "Stripe is not configured.",
        });
      }

      const {
        paymentIntentId,
        deliveryInfo = {},
      } = req.body;

      if (!paymentIntentId) {
        return res.status(400).json({
          message:
            "Payment Intent ID is required.",
        });
      }

      /*
       * Prevent duplicate order/payment creation if the
       * success page or request runs more than once.
       */
      const existingPayment =
        await payments.findOne({
          transactionId: paymentIntentId,
          buyerId: req.auth.id,
        });

      if (existingPayment) {
        const existingOrder =
          existingPayment.orderId
            ? await orders.findOne({
                _id: safeObjectId(
                  existingPayment.orderId
                ),
              })
            : null;

        return res.json({
          success: true,
          alreadyProcessed: true,
          payment: existingPayment,
          order: existingOrder,
        });
      }

      const paymentIntent =
        await stripe.paymentIntents.retrieve(
          paymentIntentId
        );

      if (!paymentIntent) {
        return res.status(404).json({
          message:
            "Stripe payment could not be found.",
        });
      }

      if (
        paymentIntent.status !== "succeeded"
      ) {
        return res.status(400).json({
          message:
            "Payment has not been completed successfully.",
          paymentStatus:
            paymentIntent.status,
        });
      }

      /*
       * Make sure this PaymentIntent belongs to
       * the currently logged-in buyer.
       */
      if (
        paymentIntent.metadata?.buyerId !==
        req.auth.id
      ) {
        return res.status(403).json({
          message:
            "This payment does not belong to your account.",
        });
      }

      const productId =
        paymentIntent.metadata?.productId;

      const productObjectId =
        safeObjectId(productId);

      if (!productObjectId) {
        return res.status(400).json({
          message:
            "Payment contains an invalid product.",
        });
      }

      const product = await products.findOne({
        _id: productObjectId,
      });

      if (!product) {
        return res.status(404).json({
          message: "Product not found.",
        });
      }

      const buyerObjectId =
        safeObjectId(req.auth.id);

      const buyer = buyerObjectId
        ? await users.findOne({
            _id: buyerObjectId,
          })
        : null;

      const quantity = Math.max(
        1,
        Number.parseInt(
          paymentIntent.metadata?.quantity,
          10
        ) || 1
      );

      /*
       * Amount is taken from Stripe, not the browser.
       */
      const totalAmount =
        Number(paymentIntent.amount_received) /
        100;

      const now = new Date();

      const orderDoc = {
        productId: product._id.toString(),

        productInfo: {
          title: product.title,
          image:
            product.images?.[0] || "",
          category: product.category || "",
          condition:
            product.condition || "",
          price: Number(product.price),
        },

        buyerInfo: {
          userId: req.auth.id,
          name:
            buyer?.name ||
            deliveryInfo.name ||
            "Buyer",
          email:
            buyer?.email ||
            req.auth.email ||
            deliveryInfo.email ||
            "",
          phone:
            deliveryInfo.phone || "",
        },

        sellerInfo: {
          userId:
            product.sellerId ||
            product.sellerInfo?.userId ||
            "",
          name:
            product.sellerInfo?.name ||
            "ReSell Seller",
          email:
            product.sellerInfo?.email ||
            "",
        },

        deliveryInfo: {
          name:
            deliveryInfo.name ||
            buyer?.name ||
            "",
          email:
            deliveryInfo.email ||
            buyer?.email ||
            req.auth.email ||
            "",
          phone:
            deliveryInfo.phone || "",
          address:
            deliveryInfo.address || "",
          city:
            deliveryInfo.city || "",
          country:
            deliveryInfo.country || "",
        },

        quantity,

        price: Number(product.price),

        totalAmount,

        currency: "usd",

        paymentStatus: "paid",

        paymentMethod: "stripe",

        transactionId:
          paymentIntent.id,

        orderStatus: "pending",

        createdAt: now,

        updatedAt: now,
      };

      const orderResult =
        await orders.insertOne(orderDoc);

      const paymentDoc = {
        transactionId:
          paymentIntent.id,

        paymentIntentId:
          paymentIntent.id,

        buyerId: req.auth.id,

        buyerName:
          buyer?.name ||
          deliveryInfo.name ||
          "Buyer",

        buyerEmail:
          buyer?.email ||
          req.auth.email ||
          deliveryInfo.email ||
          "",

        orderId:
          orderResult.insertedId.toString(),

        productId:
          product._id.toString(),

        productName:
          product.title,

        amount: totalAmount,

        currency: "usd",

        paymentStatus: "paid",

        status: "paid",

        paymentMethod: "stripe",

        paymentDate: now,

        createdAt: now,
      };

      const paymentResult =
        await payments.insertOne(
          paymentDoc
        );

      /*
       * Remove purchased product from this buyer's
       * wishlist if it was there.
       */
      await wishlists.deleteOne({
        buyerId: req.auth.id,
        productId:
          product._id.toString(),
      });

      /*
       * Update stock after purchase.
       */
      const currentStock = Number(
        product.stock ?? 1
      );

      if (
        Number.isFinite(currentStock)
      ) {
        const newStock = Math.max(
          0,
          currentStock - quantity
        );

        await products.updateOne(
          {
            _id: product._id,
          },
          {
            $set: {
              stock: newStock,

              status:
                newStock === 0
                  ? "sold"
                  : "available",

              updatedAt: now,
            },
          }
        );
      }

      res.status(201).json({
        success: true,

        message:
          "Payment successful and order created.",

        order: {
          ...orderDoc,
          _id: orderResult.insertedId,
        },

        payment: {
          ...paymentDoc,
          _id: paymentResult.insertedId,
        },
      });
    } catch (error) {
      console.error(
        "COMPLETE PAYMENT ERROR:",
        error
      );

      res.status(500).json({
        message:
          error.message ||
          "Could not complete payment.",
      });
    }
  }
);


/* ---------------------------------------------------------
   GET PAYMENT HISTORY

   Buyer -> own payments
   Admin -> every payment
   --------------------------------------------------------- */

app.get(
  "/api/payments",
  auth(["buyer", "admin"]),
  async (req, res) => {
    try {
      const query =
        req.auth.role === "admin"
          ? {}
          : {
              buyerId: req.auth.id,
            };

      const result = await payments
        .find(query)
        .sort({
          paymentDate: -1,
        })
        .toArray();

      res.json(result);
    } catch (error) {
      console.error(
        "GET PAYMENTS ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Could not load payment history.",
      });
    }
  }
);

/* =========================================================
   SERVER
   ========================================================= */

app.listen(port, () => {
  console.log(
    `ReSell Hub API running on http://localhost:${port}`
  );
});