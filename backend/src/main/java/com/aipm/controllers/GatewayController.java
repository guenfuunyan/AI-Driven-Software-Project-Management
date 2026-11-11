package com.aipm.controllers;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import jakarta.servlet.http.HttpServletRequest;
import java.net.HttpURLConnection;
import java.util.*;

@RestController
public class GatewayController {

    @Value("${ai-service.url}")
    private String aiServiceUrl;

    private final RestTemplate restTemplate;

    public GatewayController() {
        // Custom request factory that allows PATCH method on HttpURLConnection
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory() {
            @Override
            protected void prepareConnection(HttpURLConnection connection, String httpMethod) throws java.io.IOException {
                super.prepareConnection(connection, httpMethod);
                if ("PATCH".equals(httpMethod)) {
                    connection.setRequestMethod("POST");
                    connection.setRequestProperty("X-HTTP-Method-Override", "PATCH");
                }
            }
        };
        factory.setConnectTimeout(30000);
        factory.setReadTimeout(30000);
        this.restTemplate = new RestTemplate(factory);
    }

    @RequestMapping(value = "/api/**", method = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.PATCH, RequestMethod.DELETE})
    public ResponseEntity<byte[]> proxy(@RequestBody(required = false) byte[] body, 
                                        HttpMethod method, 
                                        HttpServletRequest request) {
        // Extract path after "/api"
        String fullPath = request.getRequestURI();
        String path = "";
        int apiIndex = fullPath.indexOf("/api");
        if (apiIndex != -1) {
            path = fullPath.substring(apiIndex + 4);
            if (path.startsWith("/")) {
                path = path.substring(1);
            }
        }
        
        // Construct target URI
        String queryString = request.getQueryString();
        String targetUrl = aiServiceUrl + "/" + path + (queryString != null ? "?" + queryString : "");
        
        // Copy headers
        HttpHeaders headers = new HttpHeaders();
        Enumeration<String> headerNames = request.getHeaderNames();
        while (headerNames.hasMoreElements()) {
            String headerName = headerNames.nextElement();
            if (!headerName.equalsIgnoreCase("host") && !headerName.equalsIgnoreCase("content-length")) {
                headers.addAll(headerName, Collections.list(request.getHeaders(headerName)));
            }
        }

        // For PATCH requests, use POST with X-HTTP-Method-Override
        HttpMethod actualMethod = method;
        if (method == HttpMethod.PATCH) {
            actualMethod = HttpMethod.POST;
            headers.set("X-HTTP-Method-Override", "PATCH");
        }

        HttpEntity<byte[]> httpEntity = new HttpEntity<>(body, headers);

        try {
            return restTemplate.exchange(targetUrl, actualMethod, httpEntity, byte[].class);
        } catch (HttpStatusCodeException e) {
            return ResponseEntity.status(e.getStatusCode())
                    .headers(e.getResponseHeaders())
                    .body(e.getResponseBodyAsByteArray());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(("Gateway error: " + e.getMessage()).getBytes());
        }
    }
}

