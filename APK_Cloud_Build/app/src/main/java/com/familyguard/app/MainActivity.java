package com.familyguard.app;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebChromeClient;
import android.webkit.WebViewClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.widget.LinearLayout;
import android.widget.EditText;
import android.widget.Button;
import android.widget.TextView;
import android.graphics.Color;
import android.view.View;
import android.view.ViewGroup;

public class MainActivity extends Activity {
    private WebView webView;
    private LinearLayout root;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        String server = getPreferences(MODE_PRIVATE).getString("server", "");
        if(server.isEmpty()) showSetup(""); else showWebsite(server);
    }

    private LinearLayout makeRoot() {
        LinearLayout layout = new LinearLayout(this);
        layout.setBackgroundColor(Color.rgb(246,249,255));
        layout.setOrientation(LinearLayout.VERTICAL);
        return layout;
    }
    private void showSetup(String notice) {
        root = makeRoot();
        root.setPadding(32,42,32,24);
        TextView title = new TextView(this);
        title.setText("🛡 FamilyGuard"); title.setTextColor(Color.rgb(24,65,115)); title.setTextSize(27);
        root.addView(title);
        TextView help = new TextView(this);
        help.setText("Connect to your FamilyGuard website. Start the server on your Windows PC, then enter its address, for example:\n\nhttp://192.168.1.20:3000\n\nYour phone and PC need the same Wi-Fi. The PC must remain on.\n\nA QR code scanned with your phone Camera usually opens Chrome. Use the website there for pairing, or paste that QR link into this box to pair within the app.");
        help.setTextSize(16); root.addView(help);
        EditText address = new EditText(this);
        address.setSingleLine(true); address.setHint("http://192.168.1.20:3000");
        address.setText(getPreferences(MODE_PRIVATE).getString("server", ""));
        root.addView(address);
        TextView message = new TextView(this); message.setText(notice); message.setTextColor(0xffb42318);
        root.addView(message);
        Button connect = new Button(this); connect.setText("Open FamilyGuard / QR link");
        root.addView(connect);
        connect.setOnClickListener(v -> {
            String url = address.getText().toString().trim();
            if (!url.matches("https?://[^\\s]+")) { message.setText("Enter a valid http:// or https:// address."); return; }
            try {
                android.net.Uri uri = android.net.Uri.parse(url);
                String host = uri.getHost();
                if(host == null || host.isEmpty()) {message.setText("Invalid address."); return;}
                String server = uri.getScheme()+"://"+uri.getAuthority();
                getPreferences(MODE_PRIVATE).edit().putString("server",server).apply();
                showWebsite(url);
            } catch(Exception ex){ message.setText("Invalid address."); }
        });
        setContentView(root);
    }
    private void showWebsite(String url) {
        root=makeRoot();
        LinearLayout header = new LinearLayout(this);
        header.setPadding(12,4,12,4); header.setOrientation(LinearLayout.HORIZONTAL);
        Button home = new Button(this); home.setText("Home");
        Button settings = new Button(this); settings.setText("Server / QR link");
        header.addView(home,new LinearLayout.LayoutParams(0,ViewGroup.LayoutParams.WRAP_CONTENT,1));
        header.addView(settings,new LinearLayout.LayoutParams(0,ViewGroup.LayoutParams.WRAP_CONTENT,2));
        root.addView(header);
        webView = new WebView(this);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient(){
          @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if(request.isForMainFrame()) setTitle("FamilyGuard — Check server connection");
          }
        });
        root.addView(webView,new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,0,1));
        home.setOnClickListener(v -> webView.loadUrl(getPreferences(MODE_PRIVATE).getString("server",url)));
        settings.setOnClickListener(v -> showSetup(""));
        setContentView(root);
        webView.loadUrl(url);
    }
    @Override public void onBackPressed(){
        if(webView!=null && webView.getParent()!=null && webView.canGoBack())webView.goBack();
        else super.onBackPressed();
    }
}
