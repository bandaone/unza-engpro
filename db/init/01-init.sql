-- Create user and grant privileges for Prisma migrations 
CREATE USER IF NOT EXISTS 'unza_user'@'%' IDENTIFIED BY 'root4321at'; 
GRANT ALL PRIVILEGES ON unza_engpro.* TO 'unza_user'@'%'; 
GRANT ALL PRIVILEGES ON *.* TO 'unza_user'@'%'; 
FLUSH PRIVILEGES; 
