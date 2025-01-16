-- CreateTable
CREATE TABLE "History" (
    "id" SERIAL NOT NULL,
    "user_email" TEXT NOT NULL,
    "log_groot" TEXT NOT NULL,

    CONSTRAINT "History_pkey" PRIMARY KEY ("id")
);
