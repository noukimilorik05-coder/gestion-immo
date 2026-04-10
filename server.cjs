const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path'); // Ajout du module path pour la gestion des fichiers
const { createClient } = require('@supabase/supabase-js');

/**
 * DALOPARG - Backend de Gestion Immobilière Multi-Locataires
 * Fonctionnalités :
 * - Authentification JWT avec vérification de statut en temps réel.
 * - Isolation multi-locataires via property_id.
 * - Gestion automatique des boutiques : occupation à la création, libération à la suppression/résiliation.
 * - Suivi des revenus (Paiements) et des charges (Dépenses avec catégories).
 * - Réinitialisation complète du compte.
 * - Tableau de bord admin pour la supervision globale.
 */

const app = express();
const JWT_SECRET = 'daloparg_secret_key_2026'; 

// Middleware de base
app.use(cors());
app.use(express.json());

// --- Configuration Supabase ---
const supabaseUrl = 'https://nizrvwumstftlkbwnrvu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5penJ2d3Vtc3RmdGxrYnducnZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1OTI1NjksImV4cCI6MjA5MTE2ODU2OX0.MnVAo0u9i5KwFejRAKrodwHfcNs9xh6L8jKckBo9TXE'; 
const supabase = createClient(supabaseUrl, supabaseKey);

// --- MIDDLEWARE DE SÉCURITÉ (LE VERROU TEMPS RÉEL) ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: "Authentification requise." });

    jwt.verify(token, JWT_SECRET, async (err, decodedUser) => {
        if (err) return res.status(403).json({ error: "Session invalide ou expirée." });

        try {
            const { data: userStatus, error } = await supabase
                .from('utilisateurs')
                .select('is_active, role')
                .eq('id', decodedUser.id)
                .single();

            if (error || !userStatus) {
                return res.status(403).json({ error: "Utilisateur introuvable." });
            }

            // Vérification de suspension en temps réel
            if (!userStatus.is_active) {
                return res.status(403).json({ 
                    error: "COMPTE SUSPENDU : Veuillez contacter l'administration de Daloparg." 
                });
            }

            req.user = { ...decodedUser, role: userStatus.role }; 
            next();
        } catch (dbError) {
            res.status(500).json({ error: "Erreur de vérification du profil." });
        }
    });
};

// --- ROUTES D'AUTHENTIFICATION ---

// 1. Inscription
app.post('/api/auth/register', async (req, res) => {
    const { email, password, phone, nom_propriete } = req.body;
    try {
        const property_id = "prop_" + Date.now(); 
        const { data, error } = await supabase
            .from('utilisateurs')
            .insert([{ email, password, phone, nom_propriete, property_id, role: 'user', is_active: true }])
            .select();

        if (error) return res.status(400).json({ error: error.message });
        res.status(201).json({ message: "Compte créé avec succès.", user: data[0] });
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur lors de l'inscription." });
    }
});

// 2. Connexion
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const { data: user, error } = await supabase
            .from('utilisateurs')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user || user.password !== password) {
            return res.status(401).json({ error: "Identifiants incorrects." });
        }

        if (!user.is_active) {
            return res.status(403).json({ 
                error: "ACCÈS REFUSÉ : Votre compte est suspendu. Veuillez régulariser votre situation." 
            });
        }

        const token = jwt.sign({ 
            id: user.id, 
            email: user.email, 
            property_id: user.property_id,
            role: user.role
        }, JWT_SECRET, { expiresIn: '24h' });

        res.json({ token, user });
    } catch (err) {
        res.status(500).json({ error: "Erreur de connexion." });
    }
});

// 3. Mise à jour du profil
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
    const { email, password, phone, nom_propriete } = req.body;
    try {
        const { data, error } = await supabase
            .from('utilisateurs')
            .update({ email, password, phone, nom_propriete })
            .eq('id', req.user.id)
            .select();
        
        if (error) return res.status(400).json({ error: error.message });
        res.json(data[0]);
    } catch (err) {
        res.status(500).json({ error: "Erreur de mise à jour." });
    }
});

// --- ROUTES MÉTIER (Isolées par property_id) ---

// Boutiques
app.get('/api/shops', authenticateToken, async (req, res) => {
    const { data } = await supabase.from('shops').select('*').eq('property_id', req.user.property_id);
    res.json(data || []);
});

app.post('/api/shops', authenticateToken, async (req, res) => {
    const shop = { ...req.body, property_id: req.user.property_id };
    const { data, error } = await supabase.from('shops').insert([shop]).select();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data[0]);
});

// Gestion des Locataires
app.get('/api/tenants', authenticateToken, async (req, res) => {
    const { data } = await supabase.from('tenants').select('*').eq('property_id', req.user.property_id);
    res.json(data || []);
});

app.post('/api/tenants', authenticateToken, async (req, res) => {
    const { name, phone, rent_amount, shop_id, deposit } = req.body;
    const property_id = req.user.property_id;

    try {
        const { data, error } = await supabase
            .from('tenants')
            .insert([{ 
                name, 
                phone, 
                rent_amount: Number(rent_amount), 
                shop_id: parseInt(shop_id), 
                deposit: Number(deposit || 0), 
                property_id,
                is_active: true
            }])
            .select();

        if (error) {
            console.log("--- ERREUR DÉTAILLÉE DE SUPABASE ---");
            console.log("Code d'erreur:", error.code);
            console.log("Message:", error.message);
            console.log("------------------------------------");
            return res.status(400).json({ error: error.message });
        }

        await supabase.from('shops').update({ status: 'occupied' }).eq('id', parseInt(shop_id)).eq('property_id', property_id);
        res.status(201).json(data[0]);

    } catch (err) {
        console.error("Erreur serveur:", err);
        res.status(500).json({ error: "Erreur interne" });
    }
});

app.put('/api/tenants/:id/terminate', authenticateToken, async (req, res) => {
    const tenantId = req.params.id;
    const property_id = req.user.property_id;

    try {
        const { data: tenant, error: fetchErr } = await supabase
            .from('tenants')
            .select('shop_id')
            .eq('id', tenantId)
            .eq('property_id', property_id)
            .single();

        if (fetchErr) throw fetchErr;

        const { error: tenantError } = await supabase
            .from('tenants')
            .update({ is_active: false })
            .eq('id', tenantId)
            .eq('property_id', property_id);

        if (tenantError) throw tenantError;

        if (tenant && tenant.shop_id) {
            await supabase
                .from('shops')
                .update({ status: 'available' })
                .eq('id', tenant.shop_id)
                .eq('property_id', property_id);
        }

        res.json({ message: "Bail résilié. La boutique est à nouveau disponible." });
    } catch (err) {
        console.error("Erreur de résiliation:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/tenants/:id', authenticateToken, async (req, res) => {
    const { data, error } = await supabase
        .from('tenants')
        .update(req.body)
        .eq('id', req.params.id)
        .eq('property_id', req.user.property_id) 
        .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data[0]);
});

app.delete('/api/tenants/:id', authenticateToken, async (req, res) => {
    try {
        const { data: tenant, error: fetchErr } = await supabase
            .from('tenants')
            .select('shop_id')
            .eq('id', req.params.id)
            .eq('property_id', req.user.property_id)
            .single();

        if (fetchErr) throw fetchErr;

        const { error: deleteErr } = await supabase
            .from('tenants')
            .delete()
            .eq('id', req.params.id)
            .eq('property_id', req.user.property_id);
        
        if (deleteErr) throw deleteErr;

        if (tenant && tenant.shop_id) {
            await supabase
                .from('shops')
                .update({ status: 'available' })
                .eq('id', tenant.shop_id)
                .eq('property_id', req.user.property_id);
        }

        res.json({ message: "Locataire supprimé définitivement." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Paiements (Revenus)
app.get('/api/payments', authenticateToken, async (req, res) => {
    const { data } = await supabase.from('payments').select('*').eq('property_id', req.user.property_id);
    res.json(data || []);
});

app.post('/api/payments', authenticateToken, async (req, res) => {
    const payment = { ...req.body, property_id: req.user.property_id };
    const { data, error } = await supabase.from('payments').insert([payment]).select();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data[0]);
});

// --- GESTION DES DÉPENSES ---

// Récupérer les dépenses
app.get('/api/expenses', authenticateToken, async (req, res) => {
    const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('property_id', req.user.property_id)
        .order('created_at', { ascending: false });
    
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

// Ajouter une dépense (Version avec catégorie)
app.post('/api/expenses', authenticateToken, async (req, res) => {
    const { description, amount, category } = req.body;
    
    const { data, error } = await supabase
        .from('expenses')
        .insert([{ 
            description, 
            amount: Number(amount), 
            category: category || "Général", // "Général" par défaut
            property_id: req.user.property_id 
        }])
        .select();
    
    if (error) {
        console.error("❌ ERREUR SUPABASE:", error.message);
        return res.status(400).json({ error: error.message });
    }
    
    res.status(201).json(data[0]);
});

// --- RÉINITIALISATION DU COMPTE ---
app.post('/api/reset-account', authenticateToken, async (req, res) => {
    const property_id = req.user.property_id;

    try {
        await supabase.from('payments').delete().eq('property_id', property_id);
        await supabase.from('tenants').delete().eq('property_id', property_id);
        await supabase.from('expenses').delete().eq('property_id', property_id);
        await supabase.from('shops').update({ status: 'available' }).eq('property_id', property_id);

        res.json({ message: "Compteurs remis à zéro avec succès !" });
    } catch (err) {
        console.error("Erreur lors de la remise à zéro:", err);
        res.status(500).json({ error: "Erreur lors de la remise à zéro" });
    }
});

// --- ZONE ADMIN ---

app.get('/api/admin/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Accès refusé." });
    
    try {
        const { data: users, error } = await supabase.from('utilisateurs').select('*');
        if (error) throw error;
        
        const enrichedUsers = await Promise.all(users.map(async (u) => {
            const { count: shopCount } = await supabase.from('shops').select('*', { count: 'exact', head: true }).eq('property_id', u.property_id);
            const { count: tenantCount } = await supabase.from('tenants').select('*', { count: 'exact', head: true }).eq('property_id', u.property_id);
            const { data: pms } = await supabase.from('payments').select('amount').eq('property_id', u.property_id);
            
            const totalCA = pms ? pms.reduce((acc, p) => acc + Number(p.amount), 0) : 0;
            
            return { ...u, shopCount, tenantCount, totalCA };
        }));
        
        res.json(enrichedUsers);
    } catch (err) {
        res.status(500).json({ error: "Erreur lors de la récupération des données admin." });
    }
});

app.put('/api/admin/users/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Interdit" });
    
    const { data, error } = await supabase
        .from('utilisateurs')
        .update(req.body)
        .eq('id', req.params.id)
        .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data[0]);
});

// Sert les fichiers statiques de React (le dossier dist)
app.use(express.static(path.join(__dirname, 'dist')));

// Redirige toutes les requêtes (sauf celles commençant par /api) vers l'index.html de React
app.get(/^(?!\/api).+/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Configuration du port dynamique et liaison à 0.0.0.0
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur actif sur le port ${PORT}`);
});