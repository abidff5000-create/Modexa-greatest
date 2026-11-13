package com.modexa.pro

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.webkit.*
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature

class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView
    private var chooser: ValueCallback<Array<Uri>>? = null
    private lateinit var inject: String
    private val UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

    private val pick = registerForActivityResult(ActivityResultContracts.GetContent()) { u ->
        chooser?.onReceiveValue(u?.let { arrayOf(it) } ?: emptyArray()); chooser = null
    }
    private val perm = registerForActivityResult(ActivityResultContracts.RequestPermission()) {}

    inner class Bridge {
        private val sp get() = getSharedPreferences("mx", MODE_PRIVATE)
        @JavascriptInterface fun saveProfile(name: String, avatar: String) { sp.edit().putString("n", name).putString("a", avatar).putBoolean("done", true).apply() }
        @JavascriptInterface fun getProfile(): String = org.json.JSONObject().put("name", sp.getString("n", "")).put("avatar", sp.getString("a", "")).put("done", sp.getBoolean("done", false)).toString()
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) perm.launch(Manifest.permission.RECORD_AUDIO)
        inject = assets.open("inject.js").bufferedReader().readText()
        web = WebView(this).also { setContentView(it) }
        web.settings.apply { javaScriptEnabled = true; domStorageEnabled = true; mediaPlaybackRequiresUserGesture = false; userAgentString = UA; allowFileAccess = false }
        web.addJavascriptInterface(Bridge(), "MXA")
        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT))
            WebViewCompat.addDocumentStartJavaScript(web, inject, setOf("https://discord.com"))
        web.webViewClient = object : WebViewClient() {
            override fun onPageStarted(v: WebView, url: String, f: android.graphics.Bitmap?) {
                if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT) && url.startsWith("https://discord.com")) v.evaluateJavascript(inject, null)
            }
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(r: PermissionRequest) { runOnUiThread { r.grant(r.resources) } }
            override fun onShowFileChooser(w: WebView, cb: ValueCallback<Array<Uri>>, p: FileChooserParams): Boolean {
                chooser?.onReceiveValue(null); chooser = cb; pick.launch("image/*"); return true
            }
        }
        web.loadUrl("file:///android_asset/onboarding.html")
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() { if (web.canGoBack()) web.goBack() else super.onBackPressed() }
}
