--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

-- Started on 2025-05-01 14:49:22

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 2 (class 3079 OID 16553)
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- TOC entry 4954 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- TOC entry 241 (class 1255 OID 16750)
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 222 (class 1259 OID 16650)
-- Name: campaign_target_lists; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.campaign_target_lists (
    id integer NOT NULL,
    campaign_id integer NOT NULL,
    message text DEFAULT ''::text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    first_name text NOT NULL,
    last_name text NOT NULL,
    phone_number text NOT NULL,
    sender_phone_number character varying(20),
    status character varying(20)
);


ALTER TABLE public.campaign_target_lists OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16649)
-- Name: campaign_target_lists_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.campaign_target_lists_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.campaign_target_lists_id_seq OWNER TO postgres;

--
-- TOC entry 4955 (class 0 OID 0)
-- Dependencies: 221
-- Name: campaign_target_lists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.campaign_target_lists_id_seq OWNED BY public.campaign_target_lists.id;


--
-- TOC entry 220 (class 1259 OID 16633)
-- Name: campaigns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.campaigns (
    id integer NOT NULL,
    name character varying(100),
    scheduled_at timestamp without time zone,
    sent_at timestamp without time zone,
    message_template text,
    sender_phone_number character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    delivered integer DEFAULT 0,
    failed integer DEFAULT 0,
    queued integer,
    user_id integer
);


ALTER TABLE public.campaigns OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16632)
-- Name: campaigns_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.campaigns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.campaigns_id_seq OWNER TO postgres;

--
-- TOC entry 4956 (class 0 OID 0)
-- Dependencies: 219
-- Name: campaigns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.campaigns_id_seq OWNED BY public.campaigns.id;


--
-- TOC entry 218 (class 1259 OID 16580)
-- Name: contacts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contacts (
    phone_number character varying(20) NOT NULL,
    first_name character varying(50),
    last_name character varying(50),
    email character varying(100),
    custom_attributes jsonb,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    dob text,
    message text,
    user_id integer
);


ALTER TABLE public.contacts OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 16669)
-- Name: conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversations (
    id integer NOT NULL,
    contact_phone character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    last_message_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    user_id integer,
    direction character varying(10) DEFAULT 'inbound'::character varying NOT NULL,
    twilio_number text
);


ALTER TABLE public.conversations OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16668)
-- Name: conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.conversations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.conversations_id_seq OWNER TO postgres;

--
-- TOC entry 4957 (class 0 OID 0)
-- Dependencies: 223
-- Name: conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.conversations_id_seq OWNED BY public.conversations.id;


--
-- TOC entry 229 (class 1259 OID 16823)
-- Name: employees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employees (
    id integer NOT NULL,
    user_id integer,
    username text NOT NULL,
    password text NOT NULL,
    role integer NOT NULL
);


ALTER TABLE public.employees OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 16822)
-- Name: employees_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.employees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.employees_id_seq OWNER TO postgres;

--
-- TOC entry 4958 (class 0 OID 0)
-- Dependencies: 228
-- Name: employees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.employees_id_seq OWNED BY public.employees.id;


--
-- TOC entry 226 (class 1259 OID 16684)
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    twilio_sid character varying(50),
    direction character varying(10) NOT NULL,
    status character varying(20) NOT NULL,
    body text NOT NULL,
    from_number character varying(20) NOT NULL,
    to_number character varying(20) NOT NULL,
    sent_at timestamp without time zone,
    delivered_at timestamp without time zone,
    campaign_id integer,
    conversation_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    user_id integer
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16683)
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.messages_id_seq OWNER TO postgres;

--
-- TOC entry 4959 (class 0 OID 0)
-- Dependencies: 225
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- TOC entry 227 (class 1259 OID 16711)
-- Name: opt_outs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.opt_outs (
    phone_number character varying(20) NOT NULL,
    contact_phone character varying(20),
    reason text,
    opt_out_keyword character varying(50),
    opted_out_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    processed_in_twilio boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.opt_outs OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 16849)
-- Name: twilio_numbers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.twilio_numbers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone_number text NOT NULL,
    username text,
    user_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.twilio_numbers OWNER TO postgres;

--
-- TOC entry 4747 (class 2604 OID 16653)
-- Name: campaign_target_lists id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaign_target_lists ALTER COLUMN id SET DEFAULT nextval('public.campaign_target_lists_id_seq'::regclass);


--
-- TOC entry 4742 (class 2604 OID 16636)
-- Name: campaigns id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaigns ALTER COLUMN id SET DEFAULT nextval('public.campaigns_id_seq'::regclass);


--
-- TOC entry 4750 (class 2604 OID 16672)
-- Name: conversations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations ALTER COLUMN id SET DEFAULT nextval('public.conversations_id_seq'::regclass);


--
-- TOC entry 4761 (class 2604 OID 16826)
-- Name: employees id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees ALTER COLUMN id SET DEFAULT nextval('public.employees_id_seq'::regclass);


--
-- TOC entry 4755 (class 2604 OID 16687)
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- TOC entry 4770 (class 2606 OID 16655)
-- Name: campaign_target_lists campaign_target_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaign_target_lists
    ADD CONSTRAINT campaign_target_lists_pkey PRIMARY KEY (id);


--
-- TOC entry 4768 (class 2606 OID 16643)
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- TOC entry 4765 (class 2606 OID 16589)
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (phone_number);


--
-- TOC entry 4772 (class 2606 OID 16677)
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- TOC entry 4785 (class 2606 OID 16830)
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- TOC entry 4787 (class 2606 OID 16832)
-- Name: employees employees_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_user_id_key UNIQUE (user_id);


--
-- TOC entry 4789 (class 2606 OID 16834)
-- Name: employees employees_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_username_key UNIQUE (username);


--
-- TOC entry 4778 (class 2606 OID 16693)
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- TOC entry 4780 (class 2606 OID 16695)
-- Name: messages messages_twilio_sid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_twilio_sid_key UNIQUE (twilio_sid);


--
-- TOC entry 4783 (class 2606 OID 16720)
-- Name: opt_outs opt_outs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opt_outs
    ADD CONSTRAINT opt_outs_pkey PRIMARY KEY (phone_number);


--
-- TOC entry 4791 (class 2606 OID 16876)
-- Name: twilio_numbers twilio_numbers_phone_user_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.twilio_numbers
    ADD CONSTRAINT twilio_numbers_phone_user_unique UNIQUE (phone_number, user_id);


--
-- TOC entry 4793 (class 2606 OID 16857)
-- Name: twilio_numbers twilio_numbers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.twilio_numbers
    ADD CONSTRAINT twilio_numbers_pkey PRIMARY KEY (id);


--
-- TOC entry 4766 (class 1259 OID 16745)
-- Name: idx_contacts_phone_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contacts_phone_number ON public.contacts USING btree (phone_number);


--
-- TOC entry 4773 (class 1259 OID 16749)
-- Name: idx_conversations_last_message_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_last_message_at ON public.conversations USING btree (last_message_at);


--
-- TOC entry 4774 (class 1259 OID 16744)
-- Name: idx_messages_campaign_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_campaign_id ON public.messages USING btree (campaign_id);


--
-- TOC entry 4775 (class 1259 OID 16742)
-- Name: idx_messages_conversation_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_conversation_id ON public.messages USING btree (conversation_id);


--
-- TOC entry 4776 (class 1259 OID 16748)
-- Name: idx_messages_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at);


--
-- TOC entry 4781 (class 1259 OID 16746)
-- Name: idx_opt_outs_phone_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_opt_outs_phone_number ON public.opt_outs USING btree (phone_number);


--
-- TOC entry 4801 (class 2620 OID 16754)
-- Name: campaigns trg_campaigns_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_campaigns_updated BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4800 (class 2620 OID 16752)
-- Name: contacts trg_contacts_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_contacts_updated BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4802 (class 2620 OID 16755)
-- Name: conversations trg_conversations_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_conversations_updated BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4803 (class 2620 OID 16756)
-- Name: messages trg_messages_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_messages_updated BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4794 (class 2606 OID 16658)
-- Name: campaign_target_lists campaign_target_lists_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaign_target_lists
    ADD CONSTRAINT campaign_target_lists_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- TOC entry 4795 (class 2606 OID 16678)
-- Name: conversations conversations_contact_phone_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_contact_phone_fkey FOREIGN KEY (contact_phone) REFERENCES public.contacts(phone_number);


--
-- TOC entry 4796 (class 2606 OID 16696)
-- Name: messages messages_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- TOC entry 4797 (class 2606 OID 16706)
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id);


--
-- TOC entry 4798 (class 2606 OID 16721)
-- Name: opt_outs opt_outs_contact_phone_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opt_outs
    ADD CONSTRAINT opt_outs_contact_phone_fkey FOREIGN KEY (contact_phone) REFERENCES public.contacts(phone_number);


--
-- TOC entry 4799 (class 2606 OID 16877)
-- Name: twilio_numbers twilio_numbers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.twilio_numbers
    ADD CONSTRAINT twilio_numbers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.employees(user_id);


-- Completed on 2025-05-01 14:49:23

--
-- PostgreSQL database dump complete
--

