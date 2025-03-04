-- Create Page table
CREATE TABLE "Page" (
    "id" text PRIMARY KEY NOT NULL,
    "path" text NOT NULL,
    "htmlContent" text NOT NULL,
    "projectId" text NOT NULL,
    "userId" text NOT NULL,
    "createdAt" timestamp NOT NULL,
    CONSTRAINT "Page_projectId_Project_id_fk" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE no action ON UPDATE no action,
    CONSTRAINT "Page_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE no action ON UPDATE no action
);

-- Create unique index on path
CREATE UNIQUE INDEX "Page_path_unique" ON "Page"("path");