-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'viewer');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create upload_history table
CREATE TABLE public.upload_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    data_type TEXT NOT NULL,
    record_count INTEGER NOT NULL DEFAULT 0,
    file_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on upload_history
ALTER TABLE public.upload_history ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Convenience function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Function to check if this is the first user (for auto-admin assignment)
CREATE OR REPLACE FUNCTION public.is_first_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles LIMIT 1)
$$;

-- Trigger function to assign admin role to first user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- First user becomes admin, subsequent users become viewers
  IF public.is_first_user() THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'viewer');
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for user_roles table
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policies for upload_history table
CREATE POLICY "Users can view upload history"
ON public.upload_history
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert upload history"
ON public.upload_history
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- Update RLS policies for data tables (viewers can read, admins can write)

-- ads_data policies
DROP POLICY IF EXISTS "Allow all access to ads_data" ON public.ads_data;

CREATE POLICY "Authenticated users can read ads_data"
ON public.ads_data
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert ads_data"
ON public.ads_data
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update ads_data"
ON public.ads_data
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete ads_data"
ON public.ads_data
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- followers_data policies
DROP POLICY IF EXISTS "Allow all access to followers_data" ON public.followers_data;

CREATE POLICY "Authenticated users can read followers_data"
ON public.followers_data
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert followers_data"
ON public.followers_data
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update followers_data"
ON public.followers_data
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete followers_data"
ON public.followers_data
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- marketing_data policies
DROP POLICY IF EXISTS "Allow all access to marketing_data" ON public.marketing_data;

CREATE POLICY "Authenticated users can read marketing_data"
ON public.marketing_data
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert marketing_data"
ON public.marketing_data
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update marketing_data"
ON public.marketing_data
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete marketing_data"
ON public.marketing_data
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- sales_data policies
DROP POLICY IF EXISTS "Allow all access to sales_data" ON public.sales_data;

CREATE POLICY "Authenticated users can read sales_data"
ON public.sales_data
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert sales_data"
ON public.sales_data
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update sales_data"
ON public.sales_data
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete sales_data"
ON public.sales_data
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));